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
  applyBodyAnalyticsPhotoReview,
  wizardStepAfterPhotosSaved,
  programStartedAtFromInitiationCompleted,
  buildProgramStartedAtUpdates,
  buildOnboardingPersistUpdates,
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
  it("does not auto-complete parent until all three sub-steps are settled", () => {
    const only180 = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "pending",
    });
    assert.equal(only180.bodyAnalytics, "pending");

    const onlyMedical = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "pending",
      medicalConditions: "done",
    });
    assert.equal(onlyMedical.bodyAnalytics, "pending");

    const missingBody = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "pending",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    assert.equal(missingBody.bodyAnalytics, "pending");
  });

  it("promotes parent when body measurement, 180, and medical are settled", () => {
    const status = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    assert.equal(status.bodyAnalytics, "done");
  });

  it("promotes parent when medical is skipped and the other subkeys are done", () => {
    const status = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "skipped",
    });
    assert.equal(status.bodyAnalytics, "done");
  });

  it("rejects manual bodyAnalytics done from admin", () => {
    const seeded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      progressPhotos180: "pending",
      medicalConditions: "pending",
    });
    assert.throws(
      () => setCanonicalStepStatus(seeded, "bodyAnalytics", "done"),
      (err) => err.name === "BodyAnalyticsAutoCompleteError",
    );
  });

  it("allows internalParameter after bodyAnalytics auto-completes", () => {
    const seeded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    assert.equal(seeded.bodyAnalytics, "done");
    const withInternal = setCanonicalStepStatus(seeded, "internalParameter", "done");
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
    let status = normalizePaidOnboardingStepStatus({
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    });
    for (const key of PAID_ONBOARDING_STATUS_KEYS) {
      if (key === "bodyAnalytics") continue;
      status = setCanonicalStepStatus(status, key, "done", { sequential: false });
    }
    assert.equal(status.bodyAnalytics, "done");
    for (const key of PAID_ONBOARDING_STATUS_KEYS) {
      const undone = setCanonicalStepStatus(status, key, "pending", { sequential: false });
      assert.equal(undone[key], "pending", `${key} should reopen`);
    }
  });
});

function reviewedPhoto(statuses) {
  return {
    frontPicKey: "front",
    rightPicKey: "right",
    leftPicKey: "left",
    frontReviewStatus: statuses.front,
    rightReviewStatus: statuses.right,
    leftReviewStatus: statuses.left,
  };
}

describe("body analytics photo review", () => {
  const completed = {
    personalDetails: "done",
    bodyAnalytics: "done",
    bodyMeasurement: "done",
    progressPhotos180: "done",
    medicalConditions: "done",
    internalParameter: "done",
  };

  it("reopens Body Analytics when front, right, or left is rejected", () => {
    for (const angle of ["front", "right", "left"]) {
      const opened = applyBodyAnalyticsPhotoReview(completed, {
        angle,
        action: "rejected",
        photo: reviewedPhoto({
          front: angle === "front" ? "rejected" : "approved",
          right: angle === "right" ? "rejected" : "approved",
          left: angle === "left" ? "rejected" : "approved",
        }),
      });
      assert.equal(opened.bodyAnalytics, "pending", `${angle} should reopen the step`);
      assert.equal(opened.progressPhotos180, "pending");
      assert.equal(opened.bodyMeasurement, "done");
      assert.equal(opened.medicalConditions, "done");
      assert.equal(opened.internalParameter, "done");
      assert.equal(opened.personalDetails, "done");
      assert.equal(normalizePaidOnboardingStepStatus(opened).bodyAnalytics, "pending");
    }
  });

  it("keeps the photo subkey pending so a later subkey completion cannot re-promote", () => {
    const uploaded = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      progressPhotos180: "done",
    });
    const opened = applyBodyAnalyticsPhotoReview(uploaded, {
      angle: "left",
      action: "rejected",
      photo: reviewedPhoto({ front: "pending", right: "pending", left: "rejected" }),
    });
    const later = normalizePaidOnboardingStepStatus({
      ...opened,
      bodyMeasurement: "done",
      medicalConditions: "done",
    });
    assert.equal(later.progressPhotos180, "pending");
    assert.equal(later.bodyAnalytics, "pending");
  });

  it("does not mark progressPhotos180 done on coach approval", () => {
    const pendingMedical = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "pending",
      medicalConditions: "pending",
    });
    const photosOnly = applyBodyAnalyticsPhotoReview(pendingMedical, {
      angle: "front",
      action: "approved",
      photo: reviewedPhoto({ front: "approved", right: "approved", left: "approved" }),
    });
    assert.equal(photosOnly, null);
  });

  it("returns a finished client to the app after they resubmit 180 photos", () => {
    const reopened = applyBodyAnalyticsPhotoReview(completed, {
      angle: "right",
      action: "rejected",
      photo: reviewedPhoto({ front: "rejected", right: "rejected", left: "rejected" }),
    });
    assert.equal(reopened.progressPhotos180, "pending");
    const saved = markStepDone(reopened, "progressPhotos180");
    assert.equal(wizardStepAfterPhotosSaved("photos180", saved), "done");
    assert.equal(saved.bodyAnalytics, "done");
  });

  it("continues to medical when 180 photos are the client's first upload", () => {
    const first = markStepDone(
      normalizePaidOnboardingStepStatus({ personalDetails: "done", bodyMeasurement: "done" }),
      "progressPhotos180",
    );
    assert.equal(wizardStepAfterPhotosSaved("photos180", first), "medical");
  });

  it("ignores weight photo reviews", () => {
    assert.equal(
      applyBodyAnalyticsPhotoReview(completed, { angle: "weight", action: "rejected", photo: {} }),
      null,
    );
  });
});

describe("applyBodyAnalyticsWeightPhotoReview", () => {
  const { applyBodyAnalyticsWeightPhotoReview } = require("../utils/paidOnboardingHelpers");

  const completedUser = {
    bodyMeasurementEnabled: true,
    paidOnboardingStep: "done",
    paidOnboardingStepStatus: {
      bodyAnalytics: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
    },
  };

  it("reopens body measurements when weight is rejected and coach has not disabled the app form", () => {
    const result = applyBodyAnalyticsWeightPhotoReview(completedUser, completedUser.paidOnboardingStepStatus, {
      action: "rejected",
    });
    assert.equal(result.stepStatus.bodyMeasurement, "pending");
    assert.equal(result.stepStatus.bodyAnalytics, "pending");
    assert.equal(result.extraUserUpdates.bodyMeasurementEnabled, true);
    assert.equal(result.extraUserUpdates.paidOnboardingStep, "body");
  });

  it("does nothing when coach disabled body measurements in the app", () => {
    assert.equal(
      applyBodyAnalyticsWeightPhotoReview(
        { ...completedUser, bodyMeasurementEnabled: false },
        completedUser.paidOnboardingStepStatus,
        { action: "rejected" },
      ),
      null,
    );
  });

  it("ignores approvals", () => {
    assert.equal(
      applyBodyAnalyticsWeightPhotoReview(completedUser, completedUser.paidOnboardingStepStatus, {
        action: "approved",
      }),
      null,
    );
  });
});

describe("onboardingStepJustCompleted", () => {
  const { onboardingStepJustCompleted } = require("../utils/paidOnboardingHelpers");

  it("is true only on the pending-to-done transition", () => {
    const pending = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "pending",
      medicalConditions: "done",
    });
    const done = markStepDone(pending, "progressPhotos180");
    assert.equal(onboardingStepJustCompleted(pending, done, "bodyAnalytics"), true);
    assert.equal(onboardingStepJustCompleted(done, done, "bodyAnalytics"), false);
    assert.equal(onboardingStepJustCompleted(pending, done, "protocolSettings"), false);
  });
});

describe("buildBodyAnalyticsCompletionAppLockUpdates", () => {
  const {
    buildBodyAnalyticsCompletionAppLockUpdates,
    setCanonicalStepStatus,
  } = require("../utils/paidOnboardingHelpers");

  it("persists app locks when Body Analytics first becomes done", () => {
    const pending = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "pending",
      medicalConditions: "done",
    });
    const done = markStepDone(pending, "progressPhotos180");
    const locks = buildBodyAnalyticsCompletionAppLockUpdates({}, pending, done);
    assert.deepEqual(locks, {
      progressPhotosInAppEnabled: false,
      bodyMeasurementEnabled: false,
      medicalConditionsInAppEnabled: false,
    });
  });

  it("does not override coach-enabled gates", () => {
    const pending = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "pending",
      medicalConditions: "done",
    });
    const done = markStepDone(pending, "progressPhotos180");
    const locks = buildBodyAnalyticsCompletionAppLockUpdates(
      {
        progressPhotosInAppEnabled: true,
        bodyMeasurementEnabled: true,
        medicalConditionsInAppEnabled: true,
      },
      pending,
      done,
    );
    assert.deepEqual(locks, {});
  });
});

describe("programStartedAt", () => {
  it("starts the program at midnight IST on the day after initiation completes", () => {
    const iso = programStartedAtFromInitiationCompleted(new Date("2026-10-29T18:30:00+05:30"));
    assert.equal(iso, "2026-10-29T18:30:00.000Z");
  });

  it("persists programStartedAt when program initiation is newly marked done", () => {
    const previousStatus = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
      internalParameter: "done",
      launch: "done",
      rca: "done",
      reportsBriefing: "done",
      hap: "done",
      protocolSettings: "done",
      commitmentLetter: "done",
      programInitiation: "pending",
    });
    const nextStatus = { ...previousStatus, programInitiation: "done" };
    const completedAt = new Date("2026-01-15T10:00:00+05:30");
    const updates = buildProgramStartedAtUpdates({}, previousStatus, nextStatus, completedAt);
    assert.equal(updates.programStartedAt, "2026-01-15T18:30:00.000Z");
  });

  it("does not overwrite an existing programStartedAt", () => {
    const previousStatus = normalizePaidOnboardingStepStatus({ programInitiation: "pending" });
    const nextStatus = { ...previousStatus, programInitiation: "done" };
    const updates = buildProgramStartedAtUpdates(
      { programStartedAt: "2025-06-01T18:30:00.000Z" },
      previousStatus,
      nextStatus,
    );
    assert.deepEqual(updates, {});
  });

  it("clears programStartedAt when program initiation is reopened", () => {
    const previousStatus = normalizePaidOnboardingStepStatus({ programInitiation: "done" });
    const nextStatus = { ...previousStatus, programInitiation: "pending" };
    const updates = buildProgramStartedAtUpdates(
      { programStartedAt: "2025-06-01T18:30:00.000Z" },
      previousStatus,
      nextStatus,
    );
    assert.equal(updates.programStartedAt, null);
  });

  it("includes programStartedAt in onboarding persist updates", () => {
    const previousStatus = normalizePaidOnboardingStepStatus({
      personalDetails: "done",
      bodyMeasurement: "done",
      progressPhotos180: "done",
      medicalConditions: "done",
      internalParameter: "done",
      launch: "done",
      rca: "done",
      reportsBriefing: "done",
      hap: "done",
      protocolSettings: "done",
      commitmentLetter: "done",
      programInitiation: "pending",
    });
    const nextStatus = { ...previousStatus, programInitiation: "done" };
    const updates = buildOnboardingPersistUpdates({}, previousStatus, nextStatus);
    assert.ok(updates.programStartedAt);
    assert.equal(updates.paidOnboardingCompleted, true);
  });
});
