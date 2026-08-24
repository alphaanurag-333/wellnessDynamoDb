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

  it("lets admin undo personalDetails even when profileSetup was done", () => {
    const seeded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      profileSetup: "done",
      bodyAnalytics: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    const undone = setCanonicalStepStatus(seeded, "personalDetails", "pending", {
      sequential: false,
    });
    assert.equal(undone.personalDetails, "pending");
    assert.equal(undone.profileSetup, "pending");
    assert.equal(undone.bodyAnalytics, "done");
  });

  it("lets admin undo bodyAnalytics and clears subkeys so it stays pending", () => {
    const seeded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyAnalytics: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    const undone = setCanonicalStepStatus(seeded, "bodyAnalytics", "pending", {
      sequential: false,
    });
    assert.equal(undone.bodyAnalytics, "pending");
    for (const key of BODY_ANALYTICS_SUBKEYS) {
      assert.equal(undone[key], "pending");
    }
    assert.equal(undone.personalDetails, "done");
  });

  it("lets admin undo later canonical steps without re-promotion", () => {
    let status = normalizePaidOnboardingStepStatus({});
    for (const key of PAID_ONBOARDING_STATUS_KEYS) {
      status = setCanonicalStepStatus(status, key, "done", { sequential: false });
    }
    for (const key of PAID_ONBOARDING_STATUS_KEYS) {
      const undone = setCanonicalStepStatus(status, key, "pending", { sequential: false });
      assert.equal(undone[key], "pending", `${key} should reopen`);
    }
  });
});
