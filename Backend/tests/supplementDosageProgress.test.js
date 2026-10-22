const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { computeProgressPercent } = require("../models/userSupplementDosageLogModel");
const { todayDateOnly, addDaysDateOnly } = require("../utils/dateOnly");

describe("computeProgressPercent frequency + total qty", () => {
  const periods = [
    { period: "morning__before_2nd_meal", quantity: 1 },
    { period: "afternoon__before_2nd_meal", quantity: 1 },
    { period: "evening__before_2nd_meal", quantity: 1 },
  ];

  it("advances weekly packs faster than monthly for the same start day", () => {
    const startDate = todayDateOnly();
    const weekly = {
      startDate,
      frequency: "weekly",
      intervalDays: 7,
      totalQuantity: 15,
      totalPerDay: 3,
      periods,
    };
    const monthly = {
      startDate,
      frequency: "monthly",
      intervalDays: 30,
      totalQuantity: 130,
      totalPerDay: 3,
      periods,
    };

    // 1 scheduled day so far → 3 of 15 vs 3 of 130
    assert.equal(computeProgressPercent(weekly, []), 20);
    assert.equal(computeProgressPercent(monthly, []), 2);
  });

  it("fills further after more weekly dose days elapse", () => {
    const startDate = addDaysDateOnly(todayDateOnly(), -14);
    const weekly = {
      startDate,
      frequency: "weekly",
      intervalDays: 7,
      totalQuantity: 15,
      totalPerDay: 3,
      periods,
    };

    // Dose days on start, +7, +14 → 3 days × 3 = 9 of 15 → 60%
    assert.equal(computeProgressPercent(weekly, []), 60);
  });

  it("caps at 100% once elapsed dose days cover the pack", () => {
    const startDate = addDaysDateOnly(todayDateOnly(), -35);
    const weekly = {
      startDate,
      frequency: "weekly",
      intervalDays: 7,
      totalQuantity: 15,
      totalPerDay: 3,
      periods,
    };

    // 6 weekly dose days × 3 = 18 ≥ 15 → 100%
    assert.equal(computeProgressPercent(weekly, []), 100);
  });
});
