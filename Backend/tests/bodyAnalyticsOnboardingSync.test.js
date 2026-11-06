const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSyncedBodyAnalyticsStatus,
  reconcileBodyAnalyticsStatus,
  progressPhotoSubmissionComplete,
} = require("../services/bodyAnalyticsOnboardingSyncService");
const { normalizePaidOnboardingStepStatus } = require("../utils/paidOnboardingHelpers");

describe("bodyAnalyticsOnboardingSync", () => {
  it("marks Body Analytics done when all three data flags are true", () => {
    const status = buildSyncedBodyAnalyticsStatus(
      { personalDetails: "done", bodyMeasurement: "pending", progressPhotos180: "pending", medicalConditions: "pending" },
      { bodyMeasurement: true, progressPhotos180: true, medicalConditions: true },
    );
    const normalized = normalizePaidOnboardingStepStatus(status);
    assert.equal(normalized.bodyAnalytics, "done");
  });

  it("detects a complete 180 photo set", () => {
    assert.equal(progressPhotoSubmissionComplete({ frontPicKey: "a", rightPicKey: "b", leftPicKey: "c" }), true);
  });

  it("demotes Body Analytics when subkeys are done but client data is missing", () => {
    const status = reconcileBodyAnalyticsStatus(
      {
        personalDetails: "done",
        bodyAnalytics: "done",
        bodyMeasurement: "done",
        progressPhotos180: "done",
        medicalConditions: "done",
      },
      { bodyMeasurement: false, progressPhotos180: false, medicalConditions: false },
    );
    const normalized = normalizePaidOnboardingStepStatus(status);
    assert.equal(normalized.bodyAnalytics, "pending");
    assert.equal(normalized.bodyMeasurement, "pending");
    assert.equal(normalized.progressPhotos180, "pending");
    assert.equal(normalized.medicalConditions, "pending");
  });
});
