const {
  PAID_ONBOARDING_STATUS_KEYS,
  BODY_ANALYTICS_SUBKEYS,
  STORED_ONBOARDING_STATUS_KEYS,
  defaultPaidOnboardingStepStatus,
  normalizePaidOnboardingStepStatus,
  computePaidOnboardingCompleted,
} = require("./paidOnboardingHelpers");

const CANONICAL = new Set(PAID_ONBOARDING_STATUS_KEYS);

const STEP_TO_WIZARD = {
  personalDetails: "personal",
  bodyAnalytics: "body",
  commitmentLetter: "done",
};

/**
 * Build onboarding updates for challenge free→temp Heal users.
 * Non-selected canonical steps are pre-marked done so the existing wizard
 * sequence stays intact while only selected steps remain pending.
 */
function buildChallengeOnboardingUpdates(selectedStepKeys = []) {
  const selected = new Set(
    (Array.isArray(selectedStepKeys) ? selectedStepKeys : [])
      .map((key) => String(key || "").trim())
      .filter((key) => CANONICAL.has(key))
  );

  // If admin selected nothing, require the client wizard steps only.
  if (selected.size === 0) {
    selected.add("personalDetails");
    selected.add("bodyAnalytics");
  }

  const status = defaultPaidOnboardingStepStatus();

  for (const key of PAID_ONBOARDING_STATUS_KEYS) {
    status[key] = selected.has(key) ? "pending" : "done";
  }

  if (!selected.has("bodyAnalytics")) {
    for (const sub of BODY_ANALYTICS_SUBKEYS) {
      status[sub] = "done";
    }
  } else {
    for (const sub of BODY_ANALYTICS_SUBKEYS) {
      status[sub] = "pending";
    }
  }

  if (!selected.has("personalDetails")) {
    status.profileSetup = "done";
  } else {
    status.profileSetup = "pending";
  }

  let paidOnboardingStep = "done";
  if (selected.has("personalDetails")) {
    paidOnboardingStep = "personal";
  } else if (selected.has("bodyAnalytics")) {
    paidOnboardingStep = "body";
  } else {
    paidOnboardingStep = "done";
  }

  const normalized = normalizePaidOnboardingStepStatus(status);
  return {
    paidOnboardingCompleted: computePaidOnboardingCompleted(normalized),
    paidOnboardingStep,
    paidOnboardingStepStatus: normalized,
  };
}

function snapshotAccessState(user) {
  return {
    healPaidAt: user?.healPaidAt || null,
    programPurchased: Boolean(user?.programPurchased),
    paidOnboardingCompleted: Boolean(user?.paidOnboardingCompleted),
    paidOnboardingStep: user?.paidOnboardingStep || "register",
    paidOnboardingStepStatus: user?.paidOnboardingStepStatus
      ? { ...user.paidOnboardingStepStatus }
      : defaultPaidOnboardingStepStatus(),
  };
}

function buildRestoreAccessUpdates(previousUserTier, previousAccessSnapshot) {
  const snapshot = previousAccessSnapshot || {};
  const status = normalizePaidOnboardingStepStatus(
    snapshot.paidOnboardingStepStatus || defaultPaidOnboardingStepStatus()
  );
  return {
    userTier: previousUserTier || "seek",
    healPaidAt: snapshot.healPaidAt || null,
    programPurchased: Boolean(snapshot.programPurchased),
    paidOnboardingCompleted:
      snapshot.paidOnboardingCompleted === true
        ? true
        : computePaidOnboardingCompleted(status),
    paidOnboardingStep: snapshot.paidOnboardingStep || "register",
    paidOnboardingStepStatus: status,
    challengeTemporaryAccess: null,
  };
}

module.exports = {
  STORED_ONBOARDING_STATUS_KEYS,
  STEP_TO_WIZARD,
  buildChallengeOnboardingUpdates,
  snapshotAccessState,
  buildRestoreAccessUpdates,
};
