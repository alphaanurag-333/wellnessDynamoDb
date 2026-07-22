const { describe, it, mock } = require("node:test");
const assert = require("node:assert/strict");

const appConfigModel = require("../models/appConfigModel");
const consultancyTransactionModel = require("../models/consultancyTransactionModel");

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
    mock.method(appConfigModel, "getAppConfig", async () => ({ fy_start_month: 4 }));
    mock.method(consultancyTransactionModel, "listTransactionsByUserId", async () => ({
      items: [{ fyStartYear: 2026, paymentStatus: "paid" }],
    }));

    const result = await resolveConsultancyPurchaseEligibility(
      makeUser({ userTier: "heal" }),
      { now: new Date("2026-06-15T00:00:00.000Z") }
    );
    assert.equal(result.canPurchase, true);
    assert.equal(result.reason, null);
    assert.ok(result.purchasableFy?.fyStartYear);
  });

  it("allows seek users to buy current FY when unpaid", async () => {
    mock.method(appConfigModel, "getAppConfig", async () => ({ fy_start_month: 4 }));
    mock.method(consultancyTransactionModel, "listTransactionsByUserId", async () => ({
      items: [],
    }));

    const result = await resolveConsultancyPurchaseEligibility(makeUser(), {
      now: new Date("2026-06-15T00:00:00.000Z"),
    });
    assert.equal(result.canPurchase, true);
    assert.equal(result.isRenewal, false);
    assert.equal(result.purchasableFy?.fyStartYear, 2025);
  });

  it("allows seek users to pay again after already paying current FY", async () => {
    mock.method(appConfigModel, "getAppConfig", async () => ({ fy_start_month: 4 }));
    mock.method(consultancyTransactionModel, "listTransactionsByUserId", async () => ({
      items: [{ fyStartYear: 2025, paymentStatus: "paid", paidAt: "2026-05-01T00:00:00.000Z" }],
    }));

    const result = await resolveConsultancyPurchaseEligibility(makeUser(), {
      now: new Date("2026-06-15T00:00:00.000Z"),
    });
    assert.equal(result.canPurchase, true);
    assert.equal(result.reason, null);
    assert.equal(result.purchasableFy?.fyStartYear, 2025);
  });

  it("allows consultancy_only users to pay multiple times", async () => {
    mock.method(appConfigModel, "getAppConfig", async () => ({ fy_start_month: 4 }));
    mock.method(consultancyTransactionModel, "listTransactionsByUserId", async () => ({
      items: [
        { fyStartYear: 2025, paymentStatus: "paid" },
        { fyStartYear: 2026, paymentStatus: "paid" },
      ],
    }));

    const result = await resolveConsultancyPurchaseEligibility(
      makeUser({ userTier: "consultancy_only" }),
      { now: new Date("2026-06-15T00:00:00.000Z") }
    );
    assert.equal(result.canPurchase, true);
    assert.equal(result.reason, null);
    assert.equal(result.purchasableFy?.fyStartYear, 2025);
  });
});
