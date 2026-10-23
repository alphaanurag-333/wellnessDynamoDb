const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  isMedicalConditionsInAppEnabled,
  isProgressPhotosInAppEnabled,
} = require("../models/userModel");

describe("medical conditions in app", () => {
  it("is enabled by default for existing users", () => {
    assert.equal(isMedicalConditionsInAppEnabled({}), true);
    assert.equal(isMedicalConditionsInAppEnabled({ medicalConditionsInAppEnabled: undefined }), true);
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
});
