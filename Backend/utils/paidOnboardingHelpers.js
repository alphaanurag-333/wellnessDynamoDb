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

function isStatusComplete(value) {
  return value === "done" || value === "skipped";
}

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
  const allBodyDone = BODY_ANALYTICS_SUBKEYS.every((key) => isStatusComplete(status[key]));
  if (allBodyDone && status.bodyAnalytics !== "done") {
    status.bodyAnalytics = "done";
  }
  return status;
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
  return next;
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

module.exports = {
  USER_ALLOWED_PAID_ONBOARDING_STEPS,
  PAID_ONBOARDING_STATUS_KEYS,
  BODY_ANALYTICS_SUBKEYS,
  STORED_ONBOARDING_STATUS_KEYS,
  SCHEDULE_STEP_KEYS,
  SKIPPABLE_ONBOARDING_STATUS_KEYS,
  SKIP_KEY_TO_WIZARD_STEP,
  normalizePaidOnboardingStep,
  defaultPaidOnboardingStepStatus,
  normalizePaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
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
  wizardStepAfterMedicalComplete,
  mergeStepStatusUpdate,
  advanceWizardStep,
  publicCanonicalStepStatus,
  buildOnboardingStatusUpdates,
};
