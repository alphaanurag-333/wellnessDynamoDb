const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateChallengePricing,
  isOriginallyPaidUser,
} = require("../services/challengePaymentService");

describe("calculateChallengePricing", () => {
  it("applies exclusive tax after discount", () => {
    const pricing = calculateChallengePricing(
      { tax_value: 18, tax_type: "exclusive" },
      1000,
      100
    );
    assert.equal(pricing.baseAmount, 1000);
    assert.equal(pricing.discountAmount, 100);
    assert.equal(pricing.discountedBase, 900);
    assert.equal(pricing.taxAmount, 162);
    assert.equal(pricing.totalAmount, 1062);
  });
});

describe("isOriginallyPaidUser", () => {
  it("heal users are originally paid", () => {
    assert.equal(isOriginallyPaidUser({ userTier: "heal" }), true);
  });

  it("seek users are not originally paid", () => {
    assert.equal(isOriginallyPaidUser({ userTier: "seek" }), false);
  });
});
