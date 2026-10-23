const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isMedicalConditionsInAppEnabled,
  isProgressPhotosInAppEnabled,
  isBodyMeasurementEnabled,
} = require("../models/userModel");

describe("medical conditions in app", () => {
  it("is enabled by default for existing users", () => {
    assert.equal(isMedicalConditionsInAppEnabled({}), true);
    assert.equal(isMedicalConditionsInAppEnabled({ medicalConditionsInAppEnabled: undefined }), true);
  });

  it("is locked after Body Analytics is done unless coach enabled", () => {
    assert.equal(
      isMedicalConditionsInAppEnabled({
        paidOnboardingStepStatus: { bodyAnalytics: "done" },
      }),
      false,
    );
    assert.equal(
      isMedicalConditionsInAppEnabled({
        paidOnboardingStepStatus: { bodyAnalytics: "done" },
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
        paidOnboardingStepStatus: { bodyAnalytics: "done", progressPhotos180: "done" },
      }),
      false,
    );
  });
});

describe("body measurement client fill", () => {
  it("locks after Body Analytics is done unless coach enabled", () => {
    assert.equal(
      isBodyMeasurementEnabled({
        paidOnboardingStepStatus: { bodyAnalytics: "done", bodyMeasurement: "done" },
      }),
      false,
    );
    assert.equal(
      isBodyMeasurementEnabled({
        paidOnboardingStepStatus: { bodyAnalytics: "done", bodyMeasurement: "done" },
        bodyMeasurementEnabled: true,
      }),
      true,
    );
  });
});
