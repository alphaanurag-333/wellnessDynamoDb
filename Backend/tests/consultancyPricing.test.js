const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { calculateConsultancyPricing } = require("../services/consultancyPricingService");

describe("calculateConsultancyPricing", () => {
  const config = {
    consultancy_amount: "100",
    referral_discount: "10",
    tax_value: "18",
    tax_type: "exclusive",
  };

  it("applies referral discount and exclusive tax", () => {
    const result = calculateConsultancyPricing(config, { referralCodeValid: true });
    assert.equal(result.baseAmount, 100);
    assert.equal(result.discountAmount, 10);
    assert.equal(result.discountedBase, 90);
    assert.equal(result.taxAmount, 16.2);
    assert.equal(result.totalAmount, 106.2);
  });

  it("skips discount when referral code is invalid", () => {
    const result = calculateConsultancyPricing(config, { referralCodeValid: false });
    assert.equal(result.discountAmount, 0);
    assert.equal(result.discountedBase, 100);
    assert.equal(result.totalAmount, 118);
  });

  it("handles inclusive tax type", () => {
    const result = calculateConsultancyPricing(
      { ...config, tax_type: "inclusive" },
      { referralCodeValid: true }
    );
    assert.equal(result.totalAmount, 90);
    assert.ok(result.taxAmount > 0);
  });
});
