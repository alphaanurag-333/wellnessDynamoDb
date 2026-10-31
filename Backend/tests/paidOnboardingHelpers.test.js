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

  it("marks Body Analytics done only when front, right, and left are all accepted", () => {
    const opened = applyBodyAnalyticsPhotoReview(completed, {
      angle: "front",
      action: "rejected",
      photo: reviewedPhoto({ front: "rejected", right: "approved", left: "approved" }),
    });
    const partial = applyBodyAnalyticsPhotoReview(opened, {
      angle: "right",
      action: "approved",
      photo: reviewedPhoto({ front: "pending", right: "approved", left: "pending" }),
    });
    assert.equal(partial, null);

    const stillRejected = applyBodyAnalyticsPhotoReview(completed, {
      angle: "right",
      action: "approved",
      photo: reviewedPhoto({ front: "rejected", right: "approved", left: "approved" }),
    });
    assert.equal(stillRejected.bodyAnalytics, "pending");

    const done = applyBodyAnalyticsPhotoReview(opened, {
      angle: "front",
      action: "approved",
      photo: reviewedPhoto({ front: "approved", right: "approved", left: "approved" }),
    });
    assert.equal(done.bodyAnalytics, "done");
    assert.equal(done.progressPhotos180, "done");
    assert.equal(done.bodyMeasurement, "done");
    assert.equal(done.internalParameter, "done");
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

describe("onboardingStepJustCompleted", () => {
  const { onboardingStepJustCompleted } = require("../utils/paidOnboardingHelpers");

  it("is true only on the pending-to-done transition", () => {
    const pending = normalizePaidOnboardingStepStatus({ personalDetails: "done" });
    const done = setCanonicalStepStatus(pending, "bodyAnalytics", "done");
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
    const pending = normalizePaidOnboardingStepStatus({ personalDetails: "done" });
    const done = setCanonicalStepStatus(pending, "bodyAnalytics", "done");
    const locks = buildBodyAnalyticsCompletionAppLockUpdates({}, pending, done);
    assert.deepEqual(locks, {
      progressPhotosInAppEnabled: false,
      bodyMeasurementEnabled: false,
      medicalConditionsInAppEnabled: false,
    });
  });

  it("does not override coach-enabled gates", () => {
    const pending = normalizePaidOnboardingStepStatus({ personalDetails: "done" });
    const done = setCanonicalStepStatus(pending, "bodyAnalytics", "done");
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
      bodyAnalytics: "done",
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
      bodyAnalytics: "done",
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
