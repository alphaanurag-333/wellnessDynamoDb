const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { resolveProteinGoalInputs } = require("../utils/proteinGoalCalculations");

function latestLogWithField(logs, field) {
  const sorted = [...(logs || [])].sort((a, b) =>
    String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""))
  );
  for (const log of sorted) {
    if (log?.[field] != null && Number.isFinite(Number(log[field]))) {
      return Number(log[field]);
    }
  }
  return null;
}

describe("At a Glance protein card (68 kg Sedentary)", () => {
  it("matches metabolic snapshot weight and activity for daily goal", () => {
    const bodyMeasurement = {
      weightKg: 68,
      activityLevel: "sedentary",
      recordedAt: "2026-03-01",
    };
    const { proteinGoalGm } = resolveProteinGoalInputs(bodyMeasurement, [], latestLogWithField);
    assert.equal(proteinGoalGm, 68);
    const goalLabel = `${Number(proteinGoalGm).toFixed(1)} g`.replace(/\.0 g$/, " g");
    assert.equal(goalLabel, "68 g");
  });
});
