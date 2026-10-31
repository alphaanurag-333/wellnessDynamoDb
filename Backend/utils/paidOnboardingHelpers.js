const { addDaysDateOnly } = require("./dateOnly");

const PROGRAM_START_TIMEZONE = "Asia/Kolkata";
const PROGRAM_START_IST_OFFSET = "+05:30";

const USER_ALLOWED_PAID_ONBOARDING_STEPS = [
  "register",
  "personal",
  "body",
  "photos180",
  "medical",
  "done",
];

/** Legacy alias kept for reads from older records. */
const LEGACY_PAID_ONBOARDING_STEP_ALIASES = {
  profile: "personal",
};

const PAID_ONBOARDING_STEPS = new Set(USER_ALLOWED_PAID_ONBOARDING_STEPS);

/** Canonical 10-step onboarding status keys shown in the app and admin. */
const PAID_ONBOARDING_STATUS_KEYS = [
  "personalDetails",
  "bodyAnalytics",
  "internalParameter",
  "launch",
  "rca",
  "reportsBriefing",
  "hap",
  "protocolSettings",
  "commitmentLetter",
  "programInitiation",
];

const PAID_ONBOARDING_STATUS_LABELS = {
  personalDetails: "Personal Details",
  bodyAnalytics: "Body Analytics",
  internalParameter: "Internal Parameters",
  launch: "LAUNCH",
  rca: "RCA",
  reportsBriefing: "Reports Briefing",
  hap: "HAP",
  protocolSettings: "Protocol Settings",
  commitmentLetter: "Commitment letter",
  programInitiation: "Program initiation",
};

function onboardingStepLabel(keyOrLabel) {
  const raw = String(keyOrLabel || "").trim();
  if (!raw) return "";
  return PAID_ONBOARDING_STATUS_LABELS[raw] || raw;
}

const BODY_ANALYTICS_SUBKEYS = [
  "bodyMeasurement",
  "progressPhotos180",
  "medicalConditions",
];

const STORED_ONBOARDING_STATUS_KEYS = [
  ...PAID_ONBOARDING_STATUS_KEYS,
  ...BODY_ANALYTICS_SUBKEYS,
  "profileSetup",
];

const SCHEDULE_STEP_KEYS = ["launch", "reportsBriefing", "hap", "programInitiation"];

const PAID_ONBOARDING_STATUS_VALUES = new Set(["pending", "done", "skipped"]);

const SKIPPABLE_ONBOARDING_STATUS_KEYS = new Set(BODY_ANALYTICS_SUBKEYS);

const WIZARD_STEP_SEQUENCE = ["register", "personal", "body", "photos180", "medical", "done"];

const SKIP_KEY_TO_WIZARD_STEP = {
  bodyMeasurement: "body",
  progressPhotos180: "photos180",
  medicalConditions: "medical",
};

function normalizePaidOnboardingStep(value) {
  if (value == null || value === "") return null;
  let next = String(value).toLowerCase().trim();
  if (LEGACY_PAID_ONBOARDING_STEP_ALIASES[next]) {
    next = LEGACY_PAID_ONBOARDING_STEP_ALIASES[next];
  }
  return PAID_ONBOARDING_STEPS.has(next) ? next : null;
}

function defaultPaidOnboardingStepStatus() {
  return Object.fromEntries(
    STORED_ONBOARDING_STATUS_KEYS.map((key) => [key, "pending"])
  );
}

function syncDerivedOnboardingSteps(status) {
  if (status.profileSetup === "done" && status.personalDetails !== "done") {
    status.personalDetails = "done";
  }
  // Promote parent when every sub-screen is actually done.
  // Do not demote here — admin may mark bodyAnalytics done from the panel,
  // and skipped subkeys must not wipe that (or prior steps) on normalize.
  const allBodyDone = BODY_ANALYTICS_SUBKEYS.every((key) => status[key] === "done");
  if (allBodyDone) {
    status.bodyAnalytics = "done";
  }
  return status;
}

/** Front, right, and left (back) progress photos. Weight is not part of this step. */
const BODY_PHOTO_REVIEW_ANGLES = ["front", "right", "left"];

function photoAngleReviewStatus(photo, angle) {
  if (!photo || !photo[`${angle}PicKey`]) return "";
  return String(photo[`${angle}ReviewStatus`] || "").toLowerCase().trim();
}

function photoHasRejectedAngle(photo) {
  return BODY_PHOTO_REVIEW_ANGLES.some((angle) => photoAngleReviewStatus(photo, angle) === "rejected");
}

function photoAnglesAllApproved(photo) {
  return BODY_PHOTO_REVIEW_ANGLES.every((angle) => photoAngleReviewStatus(photo, angle) === "approved");
}

/**
 * Coach / admin / wellness-coach review of a progress photo drives the
 * At a Glance Body Analytics step.
 * Rejecting front, right, or left reopens the step.
 * Accepting the set marks it done once every angle on that photo is approved.
 * Returns null when onboarding should stay as it is.
 */
function applyBodyAnalyticsPhotoReview(stepStatus, { angle, action, photo } = {}) {
  const normalizedAngle = String(angle || "").toLowerCase().trim();
  if (!BODY_PHOTO_REVIEW_ANGLES.includes(normalizedAngle)) return null;

  const normalizedAction = String(action || "").toLowerCase().trim();
  const current = normalizePaidOnboardingStepStatus(stepStatus);
  const reopen = normalizedAction === "rejected" || photoHasRejectedAngle(photo);

  if (reopen) {
    if (current.bodyAnalytics === "pending" && current.progressPhotos180 === "pending") {
      return null;
    }
    return syncDerivedOnboardingSteps({
      ...current,
      bodyAnalytics: "pending",
      progressPhotos180: "pending",
    });
  }

  if (normalizedAction === "approved" && photoAnglesAllApproved(photo)) {
    if (current.bodyAnalytics === "done" && current.progressPhotos180 === "done") {
      return null;
    }
    return syncDerivedOnboardingSteps({
      ...current,
      bodyAnalytics: "done",
      progressPhotos180: "done",
    });
  }

  return null;
}

function normalizePaidOnboardingStepStatus(value) {
  const defaults = defaultPaidOnboardingStepStatus();
  if (!value || typeof value !== "object") return defaults;
  const out = { ...defaults };
  for (const key of STORED_ONBOARDING_STATUS_KEYS) {
    const raw = value[key];
    if (raw && PAID_ONBOARDING_STATUS_VALUES.has(String(raw).toLowerCase().trim())) {
      out[key] = String(raw).toLowerCase().trim();
    }
  }
  return syncDerivedOnboardingSteps(out);
}

function computePaidOnboardingCompleted(stepStatus) {
  const status = normalizePaidOnboardingStepStatus(stepStatus);
  return PAID_ONBOARDING_STATUS_KEYS.every((key) => status[key] === "done");
}

function onboardingStepJustCompleted(previousStatus, nextStatus, stepKey) {
  const prev = normalizePaidOnboardingStepStatus(previousStatus);
  const next = normalizePaidOnboardingStepStatus(nextStatus);
  return prev[stepKey] !== "done" && next[stepKey] === "done";
}

function onboardingStepReopened(previousStatus, nextStatus, stepKey) {
  const prev = normalizePaidOnboardingStepStatus(previousStatus);
  const next = normalizePaidOnboardingStepStatus(nextStatus);
  return prev[stepKey] === "done" && next[stepKey] !== "done";
}

function calendarDateInTimezone(isoOrDate, timeZone = PROGRAM_START_TIMEZONE) {
  const dt = isoOrDate instanceof Date ? isoOrDate : new Date(isoOrDate);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(dt);
}

/** Program day 1 begins at midnight IST on the calendar day after initiation is marked done. */
function programStartedAtFromInitiationCompleted(completedAt = new Date(), timeZone = PROGRAM_START_TIMEZONE) {
  const completionDay = calendarDateInTimezone(completedAt, timeZone);
  if (!completionDay) return null;
  const startDay = addDaysDateOnly(completionDay, 1);
  if (!startDay) return null;
  return new Date(`${startDay}T00:00:00.000${PROGRAM_START_IST_OFFSET}`).toISOString();
}

function buildProgramStartedAtUpdates(user, previousStatus, nextStatus, completedAt = new Date()) {
  if (onboardingStepReopened(previousStatus, nextStatus, "programInitiation")) {
    return { programStartedAt: null };
  }
  if (user?.programStartedAt) {
    return {};
  }
  if (!onboardingStepJustCompleted(previousStatus, nextStatus, "programInitiation")) {
    return {};
  }
  const programStartedAt = programStartedAtFromInitiationCompleted(completedAt);
  return programStartedAt ? { programStartedAt } : {};
}

function getNextIncompleteStep(stepStatus) {
  const status = normalizePaidOnboardingStepStatus(stepStatus);
  for (const key of PAID_ONBOARDING_STATUS_KEYS) {
    if (status[key] !== "done") return key;
  }
  return null;
}

function countCompletedSteps(stepStatus) {
  const status = normalizePaidOnboardingStepStatus(stepStatus);
  return PAID_ONBOARDING_STATUS_KEYS.filter((key) => status[key] === "done").length;
}

function assertKnownStepKey(stepKey, { allowSubkeys = true } = {}) {
  const allowed = allowSubkeys
    ? STORED_ONBOARDING_STATUS_KEYS
    : PAID_ONBOARDING_STATUS_KEYS;
  if (!allowed.includes(stepKey)) {
    throw new Error(`Invalid onboarding status key: ${stepKey}`);
  }
}

function markStepDone(stepStatus, stepKey) {
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  assertKnownStepKey(stepKey);
  next[stepKey] = "done";
  // Admin / coach completing the parent must also complete the three subkeys
  // so later normalize/promote stays consistent.
  if (stepKey === "bodyAnalytics") {
    for (const key of BODY_ANALYTICS_SUBKEYS) {
      next[key] = "done";
    }
  }
  return syncDerivedOnboardingSteps(next);
}

function markStepSkipped(stepStatus, stepKey) {
  if (!SKIPPABLE_ONBOARDING_STATUS_KEYS.has(stepKey)) {
    throw new Error(`Step cannot be skipped: ${stepKey}`);
  }
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  if (next[stepKey] === "done") return next;
  next[stepKey] = "skipped";
  return syncDerivedOnboardingSteps(next);
}

function markStepPending(stepStatus, stepKey) {
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  assertKnownStepKey(stepKey, { allowSubkeys: false });
  next[stepKey] = "pending";
  // Clear derived/source keys so a later normalize cannot re-promote the parent.
  if (stepKey === "personalDetails") {
    next.profileSetup = "pending";
  }
  if (stepKey === "bodyAnalytics") {
    for (const key of BODY_ANALYTICS_SUBKEYS) {
      next[key] = "pending";
    }
  }
  return next;
}

function priorCanonicalStepsDone(stepStatus, stepKey) {
  const status = normalizePaidOnboardingStepStatus(stepStatus);
  const idx = PAID_ONBOARDING_STATUS_KEYS.indexOf(stepKey);
  if (idx <= 0) return true;
  return PAID_ONBOARDING_STATUS_KEYS.slice(0, idx).every((key) => status[key] === "done");
}

function setCanonicalStepStatus(stepStatus, stepKey, value, { sequential = true } = {}) {
  assertKnownStepKey(stepKey, { allowSubkeys: false });
  const normalized = String(value || "").toLowerCase().trim();
  if (normalized !== "done" && normalized !== "pending") {
    throw new Error("status must be done or pending");
  }
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  if (normalized === "done" && sequential && !priorCanonicalStepsDone(next, stepKey)) {
    const err = new Error("Complete prior onboarding steps first");
    err.name = "SequentialStepError";
    throw err;
  }
  next[stepKey] = normalized;
  if (stepKey === "personalDetails" && normalized === "pending") {
    // profileSetup done ⇒ syncDerived re-promotes personalDetails; clear it on undo.
    next.profileSetup = "pending";
  }
  if (stepKey === "bodyAnalytics") {
    if (normalized === "done") {
      for (const key of BODY_ANALYTICS_SUBKEYS) {
        next[key] = "done";
      }
    } else {
      // All three subkeys done ⇒ syncDerived re-promotes bodyAnalytics; clear on undo.
      for (const key of BODY_ANALYTICS_SUBKEYS) {
        next[key] = "pending";
      }
    }
  }
  return syncDerivedOnboardingSteps(next);
}

function wizardStepIndex(step) {
  const normalized = normalizePaidOnboardingStep(step) || "register";
  const idx = WIZARD_STEP_SEQUENCE.indexOf(normalized);
  return idx >= 0 ? idx : 0;
}

function advanceWizardStep(currentStep, targetStep) {
  const currentIdx = wizardStepIndex(currentStep);
  const targetIdx = wizardStepIndex(targetStep);
  if (targetIdx <= currentIdx) {
    return normalizePaidOnboardingStep(currentStep) || "register";
  }
  return targetStep;
}

function wizardStepAfterSkip(currentStep, skippedStatusKey) {
  const map = {
    bodyMeasurement: "photos180",
    progressPhotos180: "medical",
    medicalConditions: "done",
  };
  const target = map[skippedStatusKey];
  if (!target) return normalizePaidOnboardingStep(currentStep) || "register";
  return advanceWizardStep(currentStep, target);
}

function wizardStepAfterBodyComplete(currentStep) {
  return advanceWizardStep(currentStep, "photos180");
}

function wizardStepAfterPhotosComplete(currentStep) {
  return advanceWizardStep(currentStep, "medical");
}

/**
 * Where the client wizard goes after a 180° upload.
 * A rejection reopens photos180 even after medical is already finished.
 * Saving that resubmit should leave the wizard, not show medical again.
 */
function wizardStepAfterPhotosSaved(currentStep, stepStatus) {
  const step = normalizePaidOnboardingStep(currentStep);
  const status = normalizePaidOnboardingStepStatus(stepStatus);
  const medicalSettled = status.medicalConditions === "done" || status.medicalConditions === "skipped";
  if (step === "done" || (step === "photos180" && medicalSettled)) return "done";
  return wizardStepAfterPhotosComplete(currentStep);
}

function wizardStepAfterMedicalComplete(currentStep) {
  return advanceWizardStep(currentStep, "done");
}

function mergeStepStatusUpdate(currentStatus, patch) {
  const next = normalizePaidOnboardingStepStatus(currentStatus);
  for (const [key, value] of Object.entries(patch || {})) {
    if (!STORED_ONBOARDING_STATUS_KEYS.includes(key)) continue;
    const normalized = String(value || "").toLowerCase().trim();
    if (PAID_ONBOARDING_STATUS_VALUES.has(normalized)) {
      next[key] = normalized;
    }
  }
  return syncDerivedOnboardingSteps(next);
}

function publicCanonicalStepStatus(stepStatus) {
  const status = normalizePaidOnboardingStepStatus(stepStatus);
  return Object.fromEntries(PAID_ONBOARDING_STATUS_KEYS.map((key) => [key, status[key]]));
}

function buildOnboardingStatusUpdates(nextStatus) {
  const status = normalizePaidOnboardingStepStatus(nextStatus);
  return {
    paidOnboardingStepStatus: status,
    paidOnboardingCompleted: computePaidOnboardingCompleted(status),
  };
}

/**
 * When Body Analytics is marked done (At a Glance or all sub-steps complete),
 * hide progress photos, body measurement client fill, and medical conditions
 * in the client app unless the coach already turned a gate on explicitly.
 */
function buildBodyAnalyticsCompletionAppLockUpdates(user, previousStatus, nextStatus) {
  if (!onboardingStepJustCompleted(previousStatus, nextStatus, "bodyAnalytics")) {
    return {};
  }
  const updates = {};
  if (user?.progressPhotosInAppEnabled !== true) {
    updates.progressPhotosInAppEnabled = false;
  }
  if (user?.bodyMeasurementEnabled !== true) {
    updates.bodyMeasurementEnabled = false;
  }
  if (user?.medicalConditionsInAppEnabled !== true) {
    updates.medicalConditionsInAppEnabled = false;
  }
  return updates;
}

function buildOnboardingPersistUpdates(user, previousStatus, nextStatus, extra = {}) {
  return {
    ...buildOnboardingStatusUpdates(nextStatus),
    ...buildBodyAnalyticsCompletionAppLockUpdates(user, previousStatus, nextStatus),
    ...buildProgramStartedAtUpdates(user, previousStatus, nextStatus),
    ...extra,
  };
}

/** Wipe client + coach onboarding so a re-upgraded Heal user can start the wizard again. */
function buildPaidOnboardingResetUpdates() {
  return {
    paidOnboardingCompleted: false,
    paidOnboardingStep: "register",
    paidOnboardingStepStatus: defaultPaidOnboardingStepStatus(),
    programStartedAt: null,
  };
}

/** Eagle clients skip the 10-step wizard — mark everything done. */
function buildEaglePaidOnboardingCompleteUpdates() {
  const status = Object.fromEntries(
    STORED_ONBOARDING_STATUS_KEYS.map((key) => [key, "done"])
  );
  return {
    paidOnboardingCompleted: true,
    paidOnboardingStep: "done",
    paidOnboardingStepStatus: status,
    programStartedAt: programStartedAtFromInitiationCompleted(new Date()),
  };
}

module.exports = {
  USER_ALLOWED_PAID_ONBOARDING_STEPS,
  PAID_ONBOARDING_STATUS_KEYS,
  PAID_ONBOARDING_STATUS_LABELS,
  onboardingStepLabel,
  BODY_ANALYTICS_SUBKEYS,
  STORED_ONBOARDING_STATUS_KEYS,
  SCHEDULE_STEP_KEYS,
  SKIPPABLE_ONBOARDING_STATUS_KEYS,
  SKIP_KEY_TO_WIZARD_STEP,
  normalizePaidOnboardingStep,
  defaultPaidOnboardingStepStatus,
  normalizePaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
  onboardingStepJustCompleted,
  getNextIncompleteStep,
  countCompletedSteps,
  markStepDone,
  markStepSkipped,
  markStepPending,
  priorCanonicalStepsDone,
  setCanonicalStepStatus,
  wizardStepAfterSkip,
  wizardStepAfterBodyComplete,
  wizardStepAfterPhotosComplete,
  wizardStepAfterPhotosSaved,
  wizardStepAfterMedicalComplete,
  mergeStepStatusUpdate,
  advanceWizardStep,
  publicCanonicalStepStatus,
  buildOnboardingStatusUpdates,
  buildBodyAnalyticsCompletionAppLockUpdates,
  buildOnboardingPersistUpdates,
  buildPaidOnboardingResetUpdates,
  buildEaglePaidOnboardingCompleteUpdates,
  programStartedAtFromInitiationCompleted,
  buildProgramStartedAtUpdates,
  applyBodyAnalyticsPhotoReview,
};
