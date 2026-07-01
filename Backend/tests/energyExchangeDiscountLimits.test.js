const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeFyDiscountRanges,
  validateCoachEnergyExchangeDiscounts,
  toPublicDiscountLimits,
} = require("../utils/energyExchangeDiscountLimits");

describe("energyExchangeDiscountLimits", () => {
  const appConfig = {
    energy_exchange_fy_discount_ranges: {
      1: { min: 0, max: 20 },
      2: { min: 0, max: 25 },
      3: { min: 5, max: 15 },
      4: { min: 0, max: 10 },
    },
    energy_exchange_time_based_discount_range: { min: 0, max: 12 },
  };

  it("normalizes invalid ranges", () => {
    const ranges = normalizeFyDiscountRanges({ 1: { min: 30, max: 10 } });
    assert.deepEqual(ranges["1"], { min: 10, max: 30 });
  });

  it("rejects FY discount outside range", () => {
    const err = validateCoachEnergyExchangeDiscounts(
      { fyDiscounts: { 1: 25, 2: 10, 3: 8, 4: 5 } },
      appConfig
    );
    assert.equal(err, "FY current discount must be between 0% and 20%");
  });

  it("rejects time-based discount outside range", () => {
    const err = validateCoachEnergyExchangeDiscounts(
      { timeBasedDiscount: { percentage: 15 } },
      appConfig
    );
    assert.equal(err, "Time-based discount must be between 0% and 12%");
  });

  it("accepts discounts inside range", () => {
    const err = validateCoachEnergyExchangeDiscounts(
      {
        fyDiscounts: { 1: 10, 2: 20, 3: 10, 4: 5 },
        timeBasedDiscount: { percentage: 8 },
      },
      appConfig
    );
    assert.equal(err, null);
  });

  it("exposes public limits for coach panel", () => {
    const limits = toPublicDiscountLimits(appConfig);
    assert.equal(limits.fyDiscountRanges["3"].max, 15);
    assert.equal(limits.timeBasedDiscountRange.max, 12);
  });
});
