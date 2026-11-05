const { updateUser } = require("../models/userModel");
const {
  listBodyMeasurementsByUser,
} = require("../models/userBodyMeasurementModel");
const { listProgressPhotosByUser } = require("../models/userProgressPhotoModel");
const { getLatestMedicalConditionForUser } = require("../models/userMedicalConditionModel");
const {
  normalizePaidOnboardingStepStatus,
  markStepDone,
  buildOnboardingPersistUpdates,
  BODY_ANALYTICS_SUBKEYS,
} = require("../utils/paidOnboardingHelpers");

function progressPhotoSubmissionComplete(photo) {
  return Boolean(photo?.frontPicKey && photo?.rightPicKey && photo?.leftPicKey);
}

function buildSyncedBodyAnalyticsStatus(stepStatus, flags) {
  let next = normalizePaidOnboardingStepStatus(stepStatus);
  if (flags.bodyMeasurement && next.bodyMeasurement === "pending") {
    next = markStepDone(next, "bodyMeasurement");
  }
  if (flags.progressPhotos180 && next.progressPhotos180 === "pending") {
    next = markStepDone(next, "progressPhotos180");
  }
  if (flags.medicalConditions && next.medicalConditions === "pending") {
    next = markStepDone(next, "medicalConditions");
  }
  return next;
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
    progressPhotos180: photos.some(progressPhotoSubmissionComplete),
    medicalConditions: Boolean(medical),
  };
}

/** Promote Body Analytics subkeys when Medical, 180°, and body measurement data exist. */
async function syncBodyAnalyticsOnboardingFromClientData(user) {
  if (!user?.id) return user;
  if (user.bodyAnalyticsGlanceExcluded) {
    return user;
  }

  const flags = await loadBodyAnalyticsDataFlags(user.id);
  if (!isBodyAnalyticsClientDataReady(flags)) {
    return user;
  }

  const previousStatus = user.paidOnboardingStepStatus;
  const nextStatus = buildSyncedBodyAnalyticsStatus(previousStatus, flags);
  if (!bodyAnalyticsOnboardingStatusChanged(previousStatus, nextStatus)) {
    return user;
  }

  const updated = await updateUser(user.id, {
    ...buildOnboardingPersistUpdates(user, previousStatus, nextStatus),
    bodyAnalyticsGlanceExcluded: false,
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
  buildSyncedBodyAnalyticsStatus,
};
