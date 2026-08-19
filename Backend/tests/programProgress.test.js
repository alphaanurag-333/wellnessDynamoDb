const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  classifyFatLoss,
  classifyHba1c,
  looksLikeA1cSeries,
  isHealClientInOnboarding,
  buildOnboardingRow,
  formatChangeKg,
  formatChangePts,
  resolveGoalWeightKg,
} = require("../utils/programProgressCalculations");

describe("classifyFatLoss", () => {
  it("flags 6–10 kg down independently of goal buckets", () => {
    const flags = classifyFatLoss({ startKg: 92, currentKg: 84.2, heightCm: 165 });
    assert.equal(flags.down610, true);
    assert.ok(flags.lost >= 6);
  });

  it("flags at / 2 kg short when current is within 2 kg of goal", () => {
    const flags = classifyFatLoss({ startKg: 78, currentKg: 69.2, heightCm: null });
    assert.equal(flags.neartarget, true);
    assert.equal(flags.goalKg, 68);
  });

  it("flags halfway when at least 50% of the 10 kg goal is done but not near target", () => {
    const flags = classifyFatLoss({ startKg: 98, currentKg: 91, heightCm: 168 });
    assert.equal(flags.halfway, true);
    assert.equal(flags.neartarget, false);
    assert.equal(flags.goalKg, 88);
  });
});

describe("classifyHba1c", () => {
  it("treats 2+ point drops and values below 6.5", () => {
    const flags = classifyHba1c({ start: 8.9, current: 6.4 });
    assert.equal(flags.down2, true);
    assert.equal(flags.under65, true);
  });

  it("ignores glucose-scale mg/dL readings", () => {
    assert.equal(looksLikeA1cSeries([112, 98, 104]), false);
    const flags = classifyHba1c({ start: 112, current: 98 });
    assert.equal(flags.down2, false);
    assert.equal(flags.under65, false);
  });
});

describe("onboarding journey", () => {
  it("includes heal clients who have not finished the 10 steps", () => {
    const user = {
      userTier: "heal",
      paidOnboardingCompleted: false,
      paidOnboardingStepStatus: {
        personalDetails: "done",
        bodyAnalytics: "pending",
      },
      name: "Test Client",
      lastActiveAt: new Date().toISOString(),
    };
    assert.equal(isHealClientInOnboarding(user), true);
    const row = buildOnboardingRow(user, "Anita Rao");
    assert.match(row.step, /Step 2 of 10/);
    assert.equal(row.coach, "Anita Rao");
  });

  it("excludes completed heal clients", () => {
    const user = {
      userTier: "heal",
      paidOnboardingCompleted: true,
      paidOnboardingStepStatus: {
        personalDetails: "done",
        bodyAnalytics: "done",
        internalParameter: "done",
        launch: "done",
        rca: "done",
        reportsBriefing: "done",
        hap: "done",
        protocolSettings: "done",
        commitmentLetter: "done",
        programInitiation: "done",
      },
    };
    assert.equal(isHealClientInOnboarding(user), false);
  });
});

describe("formatters", () => {
  it("formats kg and point deltas", () => {
    assert.equal(formatChangeKg(9.5), "−9.5 kg");
    assert.equal(formatChangePts(2.5), "−2.5 pts");
  });

  it("uses a 10 kg default goal when height is missing", () => {
    assert.equal(resolveGoalWeightKg(80, null), 70);
  });
});
