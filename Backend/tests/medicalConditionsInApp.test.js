const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isMedicalConditionsInAppEnabled,
  isProgressPhotosInAppEnabled,
  isBodyMeasurementEnabled,
  buildPaidOnboardingStepLocks,
} = require("../models/userModel");

describe("medical conditions in app", () => {
  it("is enabled by default for existing users", () => {
    assert.equal(isMedicalConditionsInAppEnabled({}), true);
    assert.equal(isMedicalConditionsInAppEnabled({ medicalConditionsInAppEnabled: undefined }), true);
  });

  it("is locked after Body Analytics is done unless coach enabled", () => {
    assert.equal(
      isMedicalConditionsInAppEnabled({
        paidOnboardingStepStatus: {
          bodyAnalytics: "done",
          progressPhotos180: "done",
          medicalConditions: "done",
        },
      }),
      false,
    );
    assert.equal(
      isMedicalConditionsInAppEnabled({
        paidOnboardingStepStatus: {
          bodyAnalytics: "done",
          progressPhotos180: "done",
          medicalConditions: "done",
        },
        medicalConditionsInAppEnabled: true,
      }),
      true,
    );
  });

  it("respects explicit coach disable", () => {
    assert.equal(isMedicalConditionsInAppEnabled({ medicalConditionsInAppEnabled: false }), false);
    assert.equal(isMedicalConditionsInAppEnabled({ medicalConditionsInAppEnabled: true }), true);
  });
});

describe("progress photos in app", () => {
  it("requires coach enable unless legacy step is settled", () => {
    assert.equal(isProgressPhotosInAppEnabled({}), false);
    assert.equal(
      isProgressPhotosInAppEnabled({
        paidOnboardingStepStatus: { progressPhotos180: "done" },
      }),
      true,
    );
  });

  it("respects explicit coach toggle", () => {
    assert.equal(isProgressPhotosInAppEnabled({ progressPhotosInAppEnabled: true }), true);
    assert.equal(isProgressPhotosInAppEnabled({ progressPhotosInAppEnabled: false }), false);
  });

  it("locks after Body Analytics is done even when the photo sub-step is done", () => {
    assert.equal(
      isProgressPhotosInAppEnabled({
        paidOnboardingStepStatus: {
          bodyAnalytics: "done",
          progressPhotos180: "done",
          medicalConditions: "done",
        },
      }),
      false,
    );
  });
});

describe("buildPaidOnboardingStepLocks", () => {
  it("matches body/180 done with medical still open while admin allows all", () => {
    const locks = buildPaidOnboardingStepLocks({
      bodyMeasurementEnabled: true,
      progressPhotosInAppEnabled: true,
      paidOnboardingStepStatus: {
        bodyMeasurement: "done",
        progressPhotos180: "done",
        medicalConditions: "pending",
      },
    });
    assert.equal(locks.bodyMeasurement, true);
    assert.equal(locks.progressPhotos180, true);
    assert.equal(locks.medicalConditions, false);
  });

  it("stays false for allowed steps that are not yet done", () => {
    const locks = buildPaidOnboardingStepLocks({
      bodyMeasurementEnabled: true,
      progressPhotosInAppEnabled: true,
      paidOnboardingStepStatus: {
        bodyMeasurement: "pending",
        progressPhotos180: "pending",
        medicalConditions: "pending",
      },
    });
    assert.equal(locks.bodyMeasurement, false);
    assert.equal(locks.progressPhotos180, false);
    assert.equal(locks.medicalConditions, false);
  });

  it("reflects coach disable toggles from admin", () => {
    const locks = buildPaidOnboardingStepLocks({
      bodyMeasurementEnabled: false,
      progressPhotosInAppEnabled: false,
      medicalConditionsInAppEnabled: false,
      paidOnboardingStepStatus: {
        bodyMeasurement: "pending",
        progressPhotos180: "pending",
        medicalConditions: "pending",
      },
    });
    assert.deepEqual(locks, {
      bodyMeasurement: false,
      progressPhotos180: false,
      medicalConditions: false,
    });
  });

  it("marks all true when Body Analytics is complete", () => {
    const locks = buildPaidOnboardingStepLocks({
      paidOnboardingStepStatus: {
        bodyAnalytics: "done",
        progressPhotos180: "done",
        medicalConditions: "done",
      },
    });
    assert.deepEqual(locks, {
      bodyMeasurement: true,
      progressPhotos180: true,
      medicalConditions: true,
    });
  });
});

describe("body measurement client fill", () => {
  it("locks after Body Analytics is done unless coach enabled", () => {
    assert.equal(
      isBodyMeasurementEnabled({
        paidOnboardingStepStatus: {
          bodyAnalytics: "done",
          bodyMeasurement: "done",
          progressPhotos180: "done",
          medicalConditions: "done",
        },
      }),
      false,
    );
    assert.equal(
      isBodyMeasurementEnabled({
        paidOnboardingStepStatus: {
          bodyAnalytics: "done",
          bodyMeasurement: "done",
          progressPhotos180: "done",
          medicalConditions: "done",
        },
        bodyMeasurementEnabled: true,
      }),
      true,
    );
  });
});
