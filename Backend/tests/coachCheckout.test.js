const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseDurationToHours,
  calculateOfferPricing,
} = require("../services/coachCheckoutService");

describe("coach checkout helpers", () => {
  it("parses validity labels into hours", () => {
    assert.equal(parseDurationToHours("24 hours"), 24);
    assert.equal(parseDurationToHours("3 days"), 72);
    assert.equal(parseDurationToHours("1 year"), 8760);
    assert.equal(parseDurationToHours("No expiry"), null);
  });

  it("applies exclusive tax after the discount slab", () => {
    const pricing = calculateOfferPricing(
      { tax_value: 18, tax_type: "exclusive" },
      { baseAmount: 1000, discountPercent: 10 }
    );
    assert.equal(pricing.discountAmount, 100);
    assert.equal(pricing.discountedBase, 900);
    assert.equal(pricing.taxAmount, 162);
    assert.equal(pricing.totalAmount, 1062);
  });
});
