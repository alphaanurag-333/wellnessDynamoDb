const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  resolveConsultancyPurchaseEligibility,
} = require("../services/consultancyEligibilityService");

function makeUser(overrides = {}) {
  return {
    id: "user-1",
    userTier: "seek",
    ...overrides,
  };
}

describe("resolveConsultancyPurchaseEligibility", () => {
  it("allows heal members to book additional counselling sessions", async () => {
    const result = await resolveConsultancyPurchaseEligibility(
      makeUser({ userTier: "heal" }),
      { now: new Date("2026-06-15T00:00:00.000Z") }
    );
    assert.equal(result.canPurchase, true);
    assert.equal(result.reason, null);
    assert.equal(result.isRenewal, false);
    assert.ok(result.purchasableFy?.fyStartYear);
  });

  it("allows seek users to buy current FY when unpaid", async () => {
    const result = await resolveConsultancyPurchaseEligibility(makeUser(), {
      now: new Date("2026-06-15T00:00:00.000Z"),
    });
    assert.equal(result.canPurchase, true);
    assert.equal(result.isRenewal, false);
    assert.equal(result.purchasableFy?.fyStartYear, 2026);
  });
});
