const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSyncedBodyAnalyticsStatus,
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
});
