const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildSyncedBodyAnalyticsStatus,
  reconcileBodyAnalyticsStatus,
  progressPhotoSubmissionComplete,
  progressPhotos180ApprovedForOnboarding,
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

  it("does not count uploaded-only 180 photos toward Body Analytics flags", () => {
    const uploaded = [{
      frontPicKey: "a",
      rightPicKey: "b",
      leftPicKey: "c",
      frontReviewStatus: "pending",
      rightReviewStatus: "pending",
      leftReviewStatus: "pending",
      recordedAt: "2026-01-01T00:00:00.000Z",
    }];
    assert.equal(progressPhotos180ApprovedForOnboarding(uploaded), false);
    const status = buildSyncedBodyAnalyticsStatus(
      { personalDetails: "done", bodyMeasurement: "done", progressPhotos180: "pending", medicalConditions: "done" },
      { bodyMeasurement: true, progressPhotos180: false, medicalConditions: true },
    );
    assert.equal(normalizePaidOnboardingStepStatus(status).bodyAnalytics, "pending");
  });

  it("counts latest complete set only when all angles are approved", () => {
    const photos = [
      {
        frontPicKey: "a",
        rightPicKey: "b",
        leftPicKey: "c",
        frontReviewStatus: "approved",
        rightReviewStatus: "approved",
        leftReviewStatus: "approved",
        recordedAt: "2026-02-01T00:00:00.000Z",
      },
      {
        frontPicKey: "x",
        rightPicKey: "y",
        leftPicKey: "z",
        frontReviewStatus: "pending",
        rightReviewStatus: "pending",
        leftReviewStatus: "pending",
        recordedAt: "2026-03-01T00:00:00.000Z",
      },
    ];
    assert.equal(progressPhotos180ApprovedForOnboarding(photos), false);
    const approvedLatest = [
      {
        frontPicKey: "x",
        rightPicKey: "y",
        leftPicKey: "z",
        frontReviewStatus: "approved",
        rightReviewStatus: "approved",
        leftReviewStatus: "approved",
        recordedAt: "2026-03-01T00:00:00.000Z",
      },
      photos[0],
    ];
    assert.equal(progressPhotos180ApprovedForOnboarding(approvedLatest), true);
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
