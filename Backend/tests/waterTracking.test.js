const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  listDateRange,
  isValidDateOnly,
  addDaysDateOnly,
  dayLabel,
} = require("../utils/dateOnly");
const {
  normalizeGoalGlasses,
  normalizeGlassCount,
  formatDayLog,
} = require("../models/waterTrackingModel");

describe("dateOnly utils", () => {
  it("validates YYYY-MM-DD", () => {
    assert.equal(isValidDateOnly("2026-06-23"), true);
    assert.equal(isValidDateOnly("2026-13-01"), false);
    assert.equal(isValidDateOnly("06-23-2026"), false);
  });

  it("lists consecutive dates ending on target", () => {
    const dates = listDateRange("2026-06-23", 7);
    assert.equal(dates.length, 7);
    assert.equal(dates[0], "2026-06-17");
    assert.equal(dates[6], "2026-06-23");
  });

  it("adds days across month boundary", () => {
    assert.equal(addDaysDateOnly("2026-06-30", 1), "2026-07-01");
  });

  it("formats weekday label", () => {
    assert.equal(dayLabel("2026-06-23"), "Tue");
  });
});

describe("waterTracking validation", () => {
  it("normalizes goal glasses", () => {
    assert.equal(normalizeGoalGlasses(17), 17);
    assert.throws(() => normalizeGoalGlasses(0), /ValidationError/);
    assert.throws(() => normalizeGoalGlasses(100), /ValidationError/);
  });

  it("normalizes glass count", () => {
    assert.equal(normalizeGlassCount(0), 0);
    assert.equal(normalizeGlassCount(20), 20);
    assert.throws(() => normalizeGlassCount(-1), /ValidationError/);
  });

  it("formats day log payload using stored goal when present", () => {
    const row = formatDayLog({
      recordKey: "day#2026-06-23",
      glassCount: 12,
      goalGlasses: 8,
      glassSizeMl: 250,
    });
    assert.equal(row.date, "2026-06-23");
    assert.equal(row.glassCount, 12);
    assert.equal(row.goalGlasses, 8);
    assert.equal(row.totalMl, 3000);
    assert.equal(row.goalMl, 2000);
  });

  it("does not override stored goal with fallback", () => {
    const row = formatDayLog(
      { recordKey: "day#2026-06-23", glassCount: 5, goalGlasses: 8, glassSizeMl: 250 },
      17
    );
    assert.equal(row.goalGlasses, 8);
  });

  it("uses fallback only when day record has no stored goal", () => {
    const row = formatDayLog({ recordKey: "day#2026-06-23", glassCount: 5, glassSizeMl: 250 }, 17);
    assert.equal(row.goalGlasses, 17);
  });
});
