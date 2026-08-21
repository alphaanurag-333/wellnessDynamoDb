const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  PAID_ONBOARDING_STATUS_KEYS,
  BODY_ANALYTICS_SUBKEYS,
  buildPaidOnboardingResetUpdates,
  computePaidOnboardingCompleted,
  normalizePaidOnboardingStepStatus,
  setCanonicalStepStatus,
  markStepSkipped,
  markStepDone,
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

describe("bodyAnalytics derivation", () => {
  it("does not auto-complete parent when a subkey is skipped", () => {
    let status = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "skipped",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    assert.equal(status.bodyAnalytics, "pending");

    status = markStepDone(status, "progressPhotos180");
    status = markStepDone(status, "medicalConditions");
    status = markStepSkipped(status, "bodyMeasurement");
    assert.equal(status.bodyAnalytics, "pending");
  });

  it("promotes parent when all three subkeys are done", () => {
    const status = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    assert.equal(status.bodyAnalytics, "done");
  });

  it("lets admin mark bodyAnalytics done and keeps it after normalize", () => {
    const seeded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "skipped",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    assert.equal(seeded.bodyAnalytics, "pending");

    const marked = setCanonicalStepStatus(seeded, "bodyAnalytics", "done");
    assert.equal(marked.bodyAnalytics, "done");
    for (const key of BODY_ANALYTICS_SUBKEYS) {
      assert.equal(marked[key], "done");
    }

    const again = normalizePaidOnboardingStepStatus(marked);
    assert.equal(again.bodyAnalytics, "done");
    assert.equal(again.personalDetails, "done");
  });

  it("allows internalParameter after admin completes bodyAnalytics", () => {
    const seeded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "skipped",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    const withBody = setCanonicalStepStatus(seeded, "bodyAnalytics", "done");
    const withInternal = setCanonicalStepStatus(withBody, "internalParameter", "done");
    assert.equal(withInternal.personalDetails, "done");
    assert.equal(withInternal.bodyAnalytics, "done");
    assert.equal(withInternal.internalParameter, "done");
  });
});
