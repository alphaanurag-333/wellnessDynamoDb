const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  PAID_ONBOARDING_STATUS_KEYS,
  buildPaidOnboardingResetUpdates,
  computePaidOnboardingCompleted,
} = require("../utils/paidOnboardingHelpers");

describe("buildPaidOnboardingResetUpdates", () => {
  it("clears completion so a re-upgraded user can enter the app wizard", () => {
    const updates = buildPaidOnboardingResetUpdates();
    assert.equal(updates.paidOnboardingCompleted, false);
    assert.equal(updates.paidOnboardingStep, "register");
    assert.equal(computePaidOnboardingCompleted(updates.paidOnboardingStepStatus), false);
    for (const key of PAID_ONBOARDING_STATUS_KEYS) {
      assert.equal(updates.paidOnboardingStepStatus[key], "pending");
    }
  });
});
