const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  trackerFeatureKeysForProgramLabel,
  applyPurchasedProgramTrackers,
  normalizeHealthProgressFeatures,
  isGeneralWellbeingConcernLabel,
} = require("../utils/healthProgressHelpers");
const {
  reconcileHealthProgressFeatures,
  applyCoachHealthProgressFeatures,
} = require("../services/healthProgressProgramTrackerService");

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

  it("does not auto-enable trackers for Overall Wellbeing or Seek to Heal labels", () => {
    assert.equal(isGeneralWellbeingConcernLabel("Overall Wellbeing"), true);
    assert.equal(isGeneralWellbeingConcernLabel("Everyday Wellness"), true);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Overall Wellbeing"), []);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Everyday Wellness"), []);
    assert.deepEqual(
      trackerFeatureKeysForProgramLabel("Seek to Heal — 90-Day Transformation"),
      []
    );

    const next = applyPurchasedProgramTrackers(
      {},
      ["Overall Wellbeing", "Seek to Heal — 90-Day Transformation", "diabetes_reversal"],
      { gender: "male" }
    );
    assert.equal(next.glucose, true);
    assert.equal(next.weightPic, false);
    assert.equal(next.bloodPressure, false);
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

  it("reconciles auto trackers from labels and keeps condition comparison manual toggle", () => {
    const user = { gender: "female", healthProgressFeatures: { conditionComparison: true, weightPic: true } };
    const next = reconcileHealthProgressFeatures(user, ["Fat Loss"]);
    assert.equal(next.weightPic, true);
    assert.equal(next.glucose, false);
    assert.equal(next.conditionComparison, true);
  });

  it("drops auto trackers when wellness journey labels no longer match", () => {
    const user = {
      gender: "male",
      healthProgressFeatures: normalizeHealthProgressFeatures({
        weightPic: true,
        glucose: true,
        conditionComparison: false,
      }),
    };
    const next = reconcileHealthProgressFeatures(user, ["Thyroid Care"]);
    assert.equal(next.weightPic, false);
    assert.equal(next.glucose, false);
  });

  it("keeps coach Live-in-app toggles when locked even if labels disagree", () => {
    const user = {
      gender: "female",
      healthProgressFeaturesLockedByCoach: true,
      healthProgressFeatures: normalizeHealthProgressFeatures({
        weightPic: true,
        glucose: false,
        bloodPressure: true,
        menstrualCycle: true,
        conditionComparison: true,
      }),
    };
    const next = reconcileHealthProgressFeatures(user, ["Diabetes Reversal"]);
    assert.equal(next.weightPic, true);
    assert.equal(next.glucose, false);
    assert.equal(next.bloodPressure, true);
    assert.equal(next.menstrualCycle, true);
    assert.equal(next.conditionComparison, true);
  });

  it("still gender-gates menstrual when coach toggles are locked", () => {
    const user = {
      gender: "male",
      healthProgressFeaturesLockedByCoach: true,
      healthProgressFeatures: normalizeHealthProgressFeatures({
        menstrualCycle: true,
        glucose: true,
      }),
    };
    const next = reconcileHealthProgressFeatures(user, ["PCOS & Hormonal Balance Program"]);
    assert.equal(next.menstrualCycle, false);
    assert.equal(next.glucose, true);
  });

  it("turns on the concern and matching wellness-journey trackers after purchase", () => {
    assert.deepEqual(trackerFeatureKeysForProgramLabel("fat_loss"), ["weightPic"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("diabetes_reversal"), ["glucose"]);
    assert.deepEqual(trackerFeatureKeysForProgramLabel("Thyroid Care"), []);

    const next = applyPurchasedProgramTrackers(
      {},
      ["Diabetes Reversal", "Fat Loss", "Thyroid Care"],
      { gender: "male" }
    );
    assert.equal(next.glucose, true);
    assert.equal(next.weightPic, true);
    assert.equal(next.bloodPressure, false);
    assert.equal(next.menstrualCycle, false);
    assert.equal(next.conditionComparison, false);
  });

  it("lets coach force-enable or force-disable any tracker except menstrual for non-girls", () => {
    const enabled = applyCoachHealthProgressFeatures(
      { gender: "female" },
      {
        weightPic: true,
        glucose: false,
        bloodPressure: false,
        menstrualCycle: true,
        conditionComparison: true,
      }
    );
    assert.equal(enabled.weightPic, true);
    assert.equal(enabled.glucose, false);
    assert.equal(enabled.menstrualCycle, true);
    assert.equal(enabled.conditionComparison, true);

    const male = applyCoachHealthProgressFeatures(
      { gender: "male" },
      {
        weightPic: false,
        glucose: true,
        menstrualCycle: true,
        conditionComparison: false,
      }
    );
    assert.equal(male.weightPic, false);
    assert.equal(male.glucose, true);
    assert.equal(male.menstrualCycle, false);
  });
});
