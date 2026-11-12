const { updateUser } = require("../models/userModel");
const {
  listBodyMeasurementsByUser,
} = require("../models/userBodyMeasurementModel");
const { listProgressPhotosByUser } = require("../models/userProgressPhotoModel");
const { getLatestMedicalConditionForUser } = require("../models/userMedicalConditionModel");
const {
  normalizePaidOnboardingStepStatus,
  buildOnboardingPersistUpdates,
  BODY_ANALYTICS_SUBKEYS,
  bodyAnalyticsAutoCompleteReady,
  photoAnglesAllApproved,
} = require("../utils/paidOnboardingHelpers");

function progressPhotoSubmissionComplete(photo) {
  return Boolean(photo?.frontPicKey && photo?.rightPicKey && photo?.leftPicKey);
}

function progressPhotoRecordedAtMs(photo) {
  const raw = photo?.recordedAt || photo?.createdAt;
  const ms = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(ms) ? ms : 0;
}

/** Latest complete 180° set must be coach-approved for Body Analytics / At a Glance. */
function progressPhotos180ApprovedForOnboarding(photos) {
  const complete = (photos || []).filter(progressPhotoSubmissionComplete);
  if (!complete.length) return false;
  complete.sort((a, b) => progressPhotoRecordedAtMs(b) - progressPhotoRecordedAtMs(a));
  return photoAnglesAllApproved(complete[0]);
}

/**
 * Align subkeys with stored client data. Demotes done/skipped subkeys when data is missing.
 * When promoteFromClient is true (default), pending subkeys become done once client data exists.
 */
function reconcileBodyAnalyticsStatus(stepStatus, flags, { promoteFromClient = true } = {}) {
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  for (const key of BODY_ANALYTICS_SUBKEYS) {
    if (flags[key]) {
      if (promoteFromClient && next[key] === "pending") {
        next[key] = "done";
      }
    } else if (next[key] === "done" || next[key] === "skipped") {
      next[key] = "pending";
    }
  }
  if (bodyAnalyticsAutoCompleteReady(next)) {
    next.bodyAnalytics = "done";
  } else if (next.bodyAnalytics === "done") {
    next.bodyAnalytics = "pending";
  }
  return next;
}

function buildSyncedBodyAnalyticsStatus(stepStatus, flags) {
  return reconcileBodyAnalyticsStatus(stepStatus, flags, { promoteFromClient: true });
}

function bodyAnalyticsOnboardingStatusChanged(before, after) {
  const prev = normalizePaidOnboardingStepStatus(before);
  const next = normalizePaidOnboardingStepStatus(after);
  if (prev.bodyAnalytics !== next.bodyAnalytics) return true;
  return BODY_ANALYTICS_SUBKEYS.some((key) => prev[key] !== next[key]);
}

function isBodyAnalyticsClientDataReady(flags) {
  return Boolean(
    flags?.bodyMeasurement && flags?.progressPhotos180 && flags?.medicalConditions,
  );
}

async function loadBodyAnalyticsDataFlags(userId) {
  const [measurementResult, photoResult, medical] = await Promise.all([
    listBodyMeasurementsByUser(userId, { page: 1, limit: 1 }),
    listProgressPhotosByUser(userId, { page: 1, limit: 50 }),
    getLatestMedicalConditionForUser(userId),
  ]);
  const photos = photoResult?.items || [];
  return {
    bodyMeasurement: (measurementResult?.items || []).length > 0,
    progressPhotos180: progressPhotos180ApprovedForOnboarding(photos),
    medicalConditions: Boolean(medical),
  };
}

/** Keep Body Analytics / subkeys in sync with client body measurement, 180°, and medical data. */
async function syncBodyAnalyticsOnboardingFromClientData(user) {
  if (!user?.id) return user;

  const flags = await loadBodyAnalyticsDataFlags(user.id);
  const previousStatus = user.paidOnboardingStepStatus;
  const nextStatus = reconcileBodyAnalyticsStatus(previousStatus, flags, {
    promoteFromClient: !user.bodyAnalyticsGlanceExcluded,
  });
  if (!bodyAnalyticsOnboardingStatusChanged(previousStatus, nextStatus)) {
    return user;
  }

  const persistExtras = {};
  if (isBodyAnalyticsClientDataReady(flags) && !user.bodyAnalyticsGlanceExcluded) {
    persistExtras.bodyAnalyticsGlanceExcluded = false;
  }

  const updated = await updateUser(user.id, {
    ...buildOnboardingPersistUpdates(user, previousStatus, nextStatus),
    ...persistExtras,
  });
  return updated || user;
}

async function attachBodyAnalyticsAdminMeta(user) {
  if (!user?.id) return user;
  const flags = await loadBodyAnalyticsDataFlags(user.id);
  return {
    ...user,
    bodyAnalyticsClientDataReady: isBodyAnalyticsClientDataReady(flags),
  };
}

module.exports = {
  syncBodyAnalyticsOnboardingFromClientData,
  attachBodyAnalyticsAdminMeta,
  loadBodyAnalyticsDataFlags,
  isBodyAnalyticsClientDataReady,
  progressPhotoSubmissionComplete,
  progressPhotos180ApprovedForOnboarding,
  buildSyncedBodyAnalyticsStatus,
  reconcileBodyAnalyticsStatus,
};
