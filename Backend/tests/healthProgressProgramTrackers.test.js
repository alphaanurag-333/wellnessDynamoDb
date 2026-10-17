const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  trackerFeatureKeysForProgramLabel,
  applyPurchasedProgramTrackers,
} = require("../utils/healthProgressHelpers");

describe("purchased program health trackers", () => {
  it("maps fat loss, diabetes, pcos, and hypertension programs", () => {
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Fat Loss"), ["weightPic"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Sustainable Weight Loss — 90 Days"), ["weightPic"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Diabetes Reversal Program — 12 Weeks"), ["glucose"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("PCOS & Hormonal Balance Program"), ["menstrualCycle"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("PCOD / PCOS"), ["menstrualCycle"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("PMOS"), ["menstrualCycle"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Hypertension"), ["bloodPressure"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Heart Health & Lipid Management"), ["bloodPressure"]);
  });

  it("leaves unrelated programs unchanged", () => {
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Thyroid Wellness Program"), []);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Gut Reset & Digestive Healing"), []);
    assert.deepEqual(trackerFeatureKeysForProgramLabel(""), []);
  });

  it("turns on the matching tracker and keeps other choices", () => {
    const next = applyPurchasedProgramTrackers(
      { weightPic: false, glucose: false, bloodPressure: false, menstrualCycle: false, conditionComparison: true },
      ["Fat Loss", "Diabetes Reversal"],
      { gender: "female" }
    );
    assert.equal(next.weightPic, true);
    assert.equal(next.glucose, true);
    assert.equal(next.bloodPressure, false);
    assert.equal(next.menstrualCycle, false);
    assert.equal(next.conditionComparison, true);
  });

  it("keeps menstrual tracking off for clients who are not girls", () => {
    const next = applyPurchasedProgramTrackers(
      {},
      ["PCOS & Hormonal Balance Program"],
      { gender: "male" }
    );
    assert.equal(next.menstrualCycle, false);
  });

  it("turns menstrual tracking on for girl clients on a pcos program", () => {
    const next = applyPurchasedProgramTrackers(
      {},
      ["pcod-pcos"],
      { gender: "female" }
    );
    assert.equal(next.menstrualCycle, true);
  });
});
