const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildChallengeOnboardingUpdates,
  buildRestoreAccessUpdates,
  snapshotAccessState,
} = require("../utils/challengeOnboardingHelpers");

describe("buildChallengeOnboardingUpdates", () => {
  it("pre-marks non-selected steps as done", () => {
    const updates = buildChallengeOnboardingUpdates(["personalDetails"]);
    assert.equal(updates.paidOnboardingStep, "personal");
    assert.equal(updates.paidOnboardingStepStatus.personalDetails, "pending");
    assert.equal(updates.paidOnboardingStepStatus.bodyAnalytics, "done");
    assert.equal(updates.paidOnboardingStepStatus.launch, "done");
    assert.equal(updates.paidOnboardingStepStatus.bodyMeasurement, "done");
    assert.equal(updates.paidOnboardingCompleted, false);
  });

  it("defaults to personal + body when empty selection", () => {
    const updates = buildChallengeOnboardingUpdates([]);
    assert.equal(updates.paidOnboardingStep, "personal");
    assert.equal(updates.paidOnboardingStepStatus.personalDetails, "pending");
    assert.equal(updates.paidOnboardingStepStatus.bodyAnalytics, "pending");
    assert.equal(updates.paidOnboardingStepStatus.bodyMeasurement, "pending");
  });
});

describe("snapshot and restore", () => {
  it("restore returns previous tier and clears temp access", () => {
    const user = {
      healPaidAt: null,
      programPurchased: false,
      paidOnboardingCompleted: false,
      paidOnboardingStep: "register",
      paidOnboardingStepStatus: undefined,
    };
    const snap = snapshotAccessState(user);
    const restore = buildRestoreAccessUpdates("consultancy_only", snap);
    assert.equal(restore.userTier, "consultancy_only");
    assert.equal(restore.challengeTemporaryAccess, null);
  });
});
