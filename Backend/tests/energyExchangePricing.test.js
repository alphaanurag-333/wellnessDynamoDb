const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  getFinancialYear,
  getFinancialYearByStartYear,
  monthsRemainingInFy,
  computePlanPricing,
  activeTimeBasedDiscountPercent,
  normalizeFyStartMonth,
  buildPlansForProgram,
} = require("../services/energyExchangePricingService");

describe("energyExchangePricingService - FY math", () => {
  it("computes current FY for mid-FY date", () => {
    const fy = getFinancialYear(new Date("2026-08-15T00:00:00.000Z"), 4);
    assert.equal(fy.fyStartYear, 2026);
    assert.equal(fy.startsAt, "2026-04-01T00:00:00.000Z");
    assert.equal(fy.endsAt, "2027-03-31T23:59:59.999Z");
  });

  it("rolls FY back when before fy start month", () => {
    const fy = getFinancialYear(new Date("2026-02-15T00:00:00.000Z"), 4);
    assert.equal(fy.fyStartYear, 2025);
    assert.equal(fy.startsAt, "2025-04-01T00:00:00.000Z");
  });

  it("getFinancialYearByStartYear is consistent", () => {
    const fy = getFinancialYearByStartYear(2030, 4);
    assert.equal(fy.fyStartYear, 2030);
    assert.equal(fy.startsAt, "2030-04-01T00:00:00.000Z");
    assert.equal(fy.endsAt, "2031-03-31T23:59:59.999Z");
  });

  it("monthsRemainingInFy counts inclusively", () => {
    const fy = getFinancialYear(new Date("2026-04-01T00:00:00.000Z"), 4);
    // April → March = 12 months
    assert.equal(monthsRemainingInFy(new Date("2026-04-01T00:00:00.000Z"), fy), 12);
    // June → March = 10 months
    assert.equal(monthsRemainingInFy(new Date("2026-06-15T00:00:00.000Z"), fy), 10);
    // March → March (same month) = 1
    assert.equal(monthsRemainingInFy(new Date("2027-03-10T00:00:00.000Z"), fy), 1);
  });

  it("normalizeFyStartMonth clamps", () => {
    assert.equal(normalizeFyStartMonth(undefined), 4);
    assert.equal(normalizeFyStartMonth(0), 4);
    assert.equal(normalizeFyStartMonth(13), 4);
    assert.equal(normalizeFyStartMonth(7), 7);
    assert.equal(normalizeFyStartMonth("1"), 1);
  });
});

describe("computePlanPricing", () => {
  it("applies stacked discount + exclusive tax", () => {
    const r = computePlanPricing({
      monthsCovered: 12,
      monthlyAmount: 200,
      fyTierDiscountPercent: 10,
      timeBasedDiscountPercent: 5,
      taxPercent: 18,
      taxType: "exclusive",
    });
    assert.equal(r.baseAmount, 2400);
    assert.equal(r.effectiveDiscountPercent, 15);
    assert.equal(r.discountAmount, 360);
    assert.equal(r.discountedTotal, 2040);
    assert.equal(r.taxAmount, 367.2);
    assert.equal(r.totalAmount, 2407.2);
  });

  it("inclusive tax keeps total = discountedBase", () => {
    const r = computePlanPricing({
      monthsCovered: 6,
      monthlyAmount: 100,
      fyTierDiscountPercent: 0,
      timeBasedDiscountPercent: 0,
      taxPercent: 18,
      taxType: "inclusive",
    });
    assert.equal(r.totalAmount, 600);
    assert.ok(r.taxAmount > 0);
  });

  it("caps stacked discount at 100%", () => {
    const r = computePlanPricing({
      monthsCovered: 1,
      monthlyAmount: 100,
      fyTierDiscountPercent: 60,
      timeBasedDiscountPercent: 60,
      taxPercent: 0,
      taxType: "exclusive",
    });
    assert.equal(r.effectiveDiscountPercent, 100);
    assert.equal(r.discountAmount, 100);
    assert.equal(r.totalAmount, 0);
  });
});

describe("activeTimeBasedDiscountPercent", () => {
  const now = new Date("2026-06-15T00:00:00.000Z");

  it("returns 0 when null", () => {
    assert.equal(activeTimeBasedDiscountPercent(null, now), 0);
  });

  it("returns 0 outside window", () => {
    assert.equal(
      activeTimeBasedDiscountPercent(
        {
          percentage: 10,
          startsAt: "2027-01-01T00:00:00.000Z",
          endsAt: "2027-12-31T00:00:00.000Z",
        },
        now
      ),
      0
    );
  });

  it("returns percent when in window", () => {
    assert.equal(
      activeTimeBasedDiscountPercent(
        { percentage: 7, startsAt: "2026-01-01T00:00:00.000Z", endsAt: "2026-12-31T00:00:00.000Z" },
        now
      ),
      7
    );
  });
});

describe("buildPlansForProgram time-based discount", () => {
  it("applies time-based discount only on current FY", async () => {
    const program = {
      id: "p1",
      monthlyAmount: 200,
      currency: "INR",
      fyDiscounts: { "1": 15, "2": 5 },
      timeBasedDiscount: {
        percentage: 10,
        startsAt: "2026-01-01T00:00:00.000Z",
        endsAt: "2026-12-31T00:00:00.000Z",
        note: "Launch offer",
      },
    };
    const appConfig = { fy_start_month: 4, tax_value: 0, tax_type: "exclusive" };
    const { plans } = await buildPlansForProgram(program, appConfig, {
      now: new Date("2026-06-15T00:00:00.000Z"),
    });
    const current = plans.find((p) => p.label === "Current FY");
    const next = plans.find((p) => p.label === "Next FY");
    assert.equal(current.timeBasedDiscountPercent, 10);
    assert.equal(current.effectiveDiscountPercent, 25);
    assert.ok(current.timeBasedDiscountWindow);
    assert.equal(current.timeBasedDiscountWindow.percentage, 10);
    assert.equal(next.timeBasedDiscountPercent, 0);
    assert.equal(next.effectiveDiscountPercent, 5);
    assert.equal(next.timeBasedDiscountWindow, null);
  });
});
