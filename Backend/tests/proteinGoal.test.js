const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeActivityLevelKey,
  resolveProteinGoalGm,
  resolveProteinGoalInputs,
  PROTEIN_GOAL_DEFAULT_ACTIVITY,
} = require("../utils/proteinGoalCalculations");

describe("resolveProteinGoalGm", () => {
  it("sedentary: weight × 1", () => {
    assert.equal(resolveProteinGoalGm(68, "sedentary"), 68);
  });

  it("lightly active: weight × 1.2", () => {
    assert.equal(resolveProteinGoalGm(80, "lightly_active"), 96);
  });

  it("moderately active: weight × 1.5", () => {
    assert.equal(resolveProteinGoalGm(70, "moderately_active"), 105);
  });

  it("highly active: weight × 2", () => {
    assert.equal(resolveProteinGoalGm(50, "highly_active"), 100);
  });

  it("maps very_active to highly active multiplier", () => {
    assert.equal(resolveProteinGoalGm(50, "very_active"), 100);
  });

  it("returns null for invalid weight", () => {
    assert.equal(resolveProteinGoalGm(null, "sedentary"), null);
    assert.equal(resolveProteinGoalGm(0, "sedentary"), null);
    assert.equal(resolveProteinGoalGm(-5, "sedentary"), null);
  });

  it("defaults missing activity to moderately active (× 1.5)", () => {
    assert.equal(resolveProteinGoalGm(40, null), 60);
    assert.equal(resolveProteinGoalGm(40, ""), 60);
    assert.equal(normalizeActivityLevelKey(undefined), PROTEIN_GOAL_DEFAULT_ACTIVITY);
  });

  it("normalizes human-readable activity labels", () => {
    assert.equal(resolveProteinGoalGm(68, "Lightly Active"), 81.6);
    assert.equal(resolveProteinGoalGm(68, "Sedentary"), 68);
  });
});

describe("resolveProteinGoalInputs", () => {
  it("reads weight and activity from latest body measurement", () => {
    const result = resolveProteinGoalInputs(
      { weightKg: 68, activityLevel: "sedentary" },
      [],
      () => null
    );
    assert.equal(result.proteinGoalGm, 68);
  });

  it("falls back to metabolic logs for weight", () => {
    const result = resolveProteinGoalInputs(
      null,
      [{ weightKg: 72, recordedAt: "2026-01-01" }],
      (logs, field) => logs[0]?.[field]
    );
    assert.equal(result.weightKg, 72);
    assert.equal(result.proteinGoalGm, 108);
  });
});
