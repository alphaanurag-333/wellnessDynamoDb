const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  calculateProgramPricing,
  toPublicPricingBreakdown,
} = require("../services/programPricingService");

describe("program pricing breakdown", () => {
  it("splits base, discount and GST into display lines", () => {
    const breakdown = toPublicPricingBreakdown(
      {
        baseAmount: 22999,
        discountAmount: 4599.8,
        discountedBase: 18399.2,
        taxAmount: 0,
        taxPercent: 0,
        taxType: "inclusive",
        totalAmount: 18399.2,
        currency: "INR",
        discountPercent: 20,
      },
      { discountLabel: "annual plan" }
    );

    assert.equal(breakdown.baseAmount, 22999);
    assert.equal(breakdown.discountAmount, 4599.8);
    assert.equal(breakdown.gstAmount, 0);
    assert.equal(breakdown.netPayable, 18399.2);
    assert.deepEqual(
      breakdown.lines.map((row) => row.key),
      ["base", "discount", "gst", "total"]
    );
    assert.equal(breakdown.lines[1].label, "Discount (20% · annual plan)");
    assert.equal(breakdown.lines[1].amount, -4599.8);
  });

  it("labels exclusive GST on an assigned program with no discount", () => {
    const pricing = calculateProgramPricing(
      { tax_value: 18, tax_type: "exclusive" },
      { baseAmount: 22999 }
    );
    const breakdown = toPublicPricingBreakdown(pricing);

    assert.equal(breakdown.baseAmount, 22999);
    assert.equal(breakdown.discountAmount, 0);
    assert.equal(breakdown.gstAmount, 4139.82);
    assert.equal(breakdown.totalAmount, 27138.82);
    assert.equal(breakdown.taxLabel, "GST (Exclusive, 18%)");
    assert.equal(breakdown.lines[2].key, "gst");
  });
});

const {
  programPurchaseNeedsFinalization,
  userProgramLookupIds,
} = require("../services/programPaymentService");

describe("program payment finalization helpers", () => {
  it("needs finalization until purchase flags and the pending offer are settled", () => {
    assert.equal(programPurchaseNeedsFinalization({ programPurchased: false }), true);
    assert.equal(
      programPurchaseNeedsFinalization({
        programPurchased: true,
        pendingCoachCheckout: { productType: "program", itemId: "diabetes" },
      }),
      true
    );
    assert.equal(
      programPurchaseNeedsFinalization({
        programPurchased: true,
        pendingCoachCheckout: {},
      }),
      false
    );
  });

  it("does not treat a coach-checkout catalog slug as a UserProgram id by itself", () => {
    const ids = userProgramLookupIds(
      { assignedProgramId: null },
      { userSnapshot: { programId: "diabetes", catalogItemId: "diabetes" } }
    );
    assert.deepEqual(ids, ["diabetes"]);
  });

  it("prefers the assigned UserProgram UUID over the catalog slug", () => {
    const ids = userProgramLookupIds(
      { assignedProgramId: "8ffa7613-31bf-4344-8ecf-f7f48a04b131" },
      {
        userSnapshot: {
          userProgramId: "8ffa7613-31bf-4344-8ecf-f7f48a04b131",
          programId: "diabetes",
        },
      }
    );
    assert.equal(ids[0], "8ffa7613-31bf-4344-8ecf-f7f48a04b131");
    assert.ok(ids.includes("diabetes"));
  });
});
