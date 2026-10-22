const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  shouldAlertDosageNearComplete,
  NEAR_COMPLETE_PERCENT,
} = require("../services/dosageProgressAlertService");

describe("shouldAlertDosageNearComplete", () => {
  const base = {
    id: "dose-1",
    name: "Ashwagandha",
    status: "active",
    publishedToApp: true,
  };

  it(`alerts at ${NEAR_COMPLETE_PERCENT}% or above for live dosages`, () => {
    assert.equal(shouldAlertDosageNearComplete(base, 89), false);
    assert.equal(shouldAlertDosageNearComplete(base, 90), true);
    assert.equal(shouldAlertDosageNearComplete(base, 100), true);
  });

  it("skips drafts, stopped plans, and already notified dosages", () => {
    assert.equal(
      shouldAlertDosageNearComplete({ ...base, publishedToApp: false }, 95),
      false,
    );
    assert.equal(
      shouldAlertDosageNearComplete({ ...base, status: "stopped" }, 95),
      false,
    );
    assert.equal(
      shouldAlertDosageNearComplete({ ...base, nearCompleteNotifiedAt: "2026-10-21T00:00:00.000Z" }, 95),
      false,
    );
  });
});
