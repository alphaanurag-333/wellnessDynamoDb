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

const PAID_ONBOARDING_STATUS_KEYS = [
  "personalDetails",
  "profileSetup",
  "bodyMeasurement",
  "progressPhotos180",
  "medicalConditions",
  "internalParameter",
  "launch",
];

const PAID_ONBOARDING_STATUS_VALUES = new Set(["pending", "done", "skipped"]);

const SKIPPABLE_ONBOARDING_STATUS_KEYS = new Set([
  "bodyMeasurement",
  "progressPhotos180",
  "medicalConditions",
]);

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
    PAID_ONBOARDING_STATUS_KEYS.map((key) => [key, "pending"])
  );
}

function normalizePaidOnboardingStepStatus(value) {
  const defaults = defaultPaidOnboardingStepStatus();
  if (!value || typeof value !== "object") return defaults;
  const out = { ...defaults };
  for (const key of PAID_ONBOARDING_STATUS_KEYS) {
    const raw = value[key];
    if (raw && PAID_ONBOARDING_STATUS_VALUES.has(String(raw).toLowerCase().trim())) {
      out[key] = String(raw).toLowerCase().trim();
    }
  }
  return out;
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

function markStepDone(stepStatus, stepKey) {
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  if (!PAID_ONBOARDING_STATUS_KEYS.includes(stepKey)) {
    throw new Error(`Invalid onboarding status key: ${stepKey}`);
  }
  next[stepKey] = "done";
  return next;
}

function markStepSkipped(stepStatus, stepKey) {
  if (!SKIPPABLE_ONBOARDING_STATUS_KEYS.has(stepKey)) {
    throw new Error(`Step cannot be skipped: ${stepKey}`);
  }
  const next = normalizePaidOnboardingStepStatus(stepStatus);
  if (next[stepKey] === "done") return next;
  next[stepKey] = "skipped";
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
    if (!PAID_ONBOARDING_STATUS_KEYS.includes(key)) continue;
    const normalized = String(value || "").toLowerCase().trim();
    if (PAID_ONBOARDING_STATUS_VALUES.has(normalized)) {
      next[key] = normalized;
    }
  }
  return next;
}

module.exports = {
  USER_ALLOWED_PAID_ONBOARDING_STEPS,
  PAID_ONBOARDING_STATUS_KEYS,
  SKIPPABLE_ONBOARDING_STATUS_KEYS,
  normalizePaidOnboardingStep,
  defaultPaidOnboardingStepStatus,
  normalizePaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
  getNextIncompleteStep,
  countCompletedSteps,
  markStepDone,
  markStepSkipped,
  wizardStepAfterSkip,
  wizardStepAfterBodyComplete,
  wizardStepAfterPhotosComplete,
  wizardStepAfterMedicalComplete,
  mergeStepStatusUpdate,
  advanceWizardStep,
};
