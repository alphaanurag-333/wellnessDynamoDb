const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  normalizeGoalSteps,
  normalizeStepCount,
  computeDistanceMeters,
  computeCaloriesKcal,
  shouldReplaceDay,
  externalIdsSignature,
  formatDayLog,
  formatConnections,
} = require("../models/stepsTrackingModel");

describe("stepsTracking validation", () => {
  it("normalizes goal steps", () => {
    assert.equal(normalizeGoalSteps(12000), 12000);
    assert.throws(() => normalizeGoalSteps(999), /ValidationError/);
    assert.throws(() => normalizeGoalSteps(50001), /ValidationError/);
  });

  it("normalizes step count", () => {
    assert.equal(normalizeStepCount(0), 0);
    assert.equal(normalizeStepCount(6000), 6000);
    assert.throws(() => normalizeStepCount(-1), /ValidationError/);
  });

  it("computes distance and calories when omitted", () => {
    assert.equal(computeDistanceMeters(6000), Math.round(6000 * 0.762));
    assert.equal(computeCaloriesKcal(6000), Math.round(6000 * 0.04));
  });

  it("uses provided distance and calories when present", () => {
    assert.equal(computeDistanceMeters(6000, 4572), 4572);
    assert.equal(computeCaloriesKcal(6000, 240), 240);
  });
});

describe("stepsTracking sync rules", () => {
  it("replaces when incoming syncedAt is newer", () => {
    const existing = { syncedAt: "2026-06-22T08:00:00.000Z", externalIds: ["a"] };
    const incoming = { syncedAt: "2026-06-22T09:00:00.000Z", externalIds: ["a"] };
    assert.equal(shouldReplaceDay(existing, incoming), true);
  });

  it("skips when syncedAt is older and externalIds match", () => {
    const existing = { syncedAt: "2026-06-22T09:00:00.000Z", externalIds: ["a", "b"] };
    const incoming = { syncedAt: "2026-06-22T08:00:00.000Z", externalIds: ["b", "a"] };
    assert.equal(shouldReplaceDay(existing, incoming), false);
  });

  it("replaces when externalIds differ", () => {
    const existing = { syncedAt: "2026-06-22T09:00:00.000Z", externalIds: ["a"] };
    const incoming = { syncedAt: "2026-06-22T09:00:00.000Z", externalIds: ["a", "b"] };
    assert.equal(shouldReplaceDay(existing, incoming), true);
  });

  it("compares externalIds order-independently", () => {
    assert.equal(externalIdsSignature(["b", "a"]), externalIdsSignature(["a", "b"]));
  });
});

describe("stepsTracking formatting", () => {
  it("formats day log payload", () => {
    const row = formatDayLog({
      recordKey: "day#2026-06-22",
      stepCount: 6000,
      goalSteps: 12000,
      distanceMeters: 4572,
      caloriesKcal: 240,
      source: "health_connect",
      updatedAt: "2026-06-22T09:15:00.000Z",
    });
    assert.equal(row.date, "2026-06-22");
    assert.equal(row.stepCount, 6000);
    assert.equal(row.goalSteps, 12000);
    assert.equal(row.distanceKm, 4.57);
    assert.equal(row.caloriesKcal, 240);
    assert.equal(row.source, "health_connect");
  });

  it("formats default connections", () => {
    const connections = formatConnections(null);
    assert.equal(connections.android.connected, false);
    assert.equal(connections.ios.connected, false);
    assert.equal(connections.android.lastSyncedAt, null);
  });
});
