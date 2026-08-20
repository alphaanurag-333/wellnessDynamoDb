const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  parseDurationToHours,
  calculateOfferPricing,
  isCheckoutOfferExpired,
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  toPublicCoachProgramOffer,
  canActorTriggerCheckout,
  deriveCheckoutCoachIds,
  isPendingCheckoutOrderReusable,
  buildUserProgramGetPayload,
  toCheckoutHistoryRow,
  checkoutReminderBlockReason,
  resolvePwcStaffReferralCode,
} = require("../services/coachCheckoutService");

function futureIso(ms = 60 * 60 * 1000) {
  return new Date(Date.now() + ms).toISOString();
}

function pastIso(ms = 60 * 60 * 1000) {
  return new Date(Date.now() - ms).toISOString();
}

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
    assert.equal(pricing.baseAmount, 1000);
    assert.equal(pricing.discountAmount, 100);
    assert.equal(pricing.discountedBase, 900);
    assert.equal(pricing.taxAmount, 162);
    assert.equal(pricing.totalAmount, 1062);
    assert.equal(pricing.discountPercent, 10);
  });

  it("takes 20% off the listed 22999 when tax is inclusive", () => {
    const pricing = calculateOfferPricing(
      { tax_value: 18, tax_type: "inclusive" },
      { baseAmount: 22999, discountPercent: 20 }
    );
    assert.equal(pricing.baseAmount, 22999);
    assert.equal(pricing.discountAmount, 4599.8);
    assert.equal(pricing.discountedBase, 18399.2);
    assert.equal(pricing.totalAmount, 18399.2);
    assert.ok(pricing.taxAmount > 0);
  });

  it("applies 10% off 29999 then exclusive 5% GST", () => {
    const pricing = calculateOfferPricing(
      { tax_value: 5, tax_type: "exclusive" },
      { baseAmount: 29999, discountPercent: 10 }
    );
    assert.equal(pricing.discountAmount, 2999.9);
    assert.equal(pricing.discountedBase, 26999.1);
    assert.equal(pricing.taxAmount, 1349.96);
    assert.equal(pricing.totalAmount, 28349.06);
  });
});

describe("pending coach checkout offer selection", () => {
  const activeOffer = {
    productType: "program",
    itemId: "fat-loss",
    itemName: "Fat Loss",
    amount: 24999,
    discountPercent: 15,
    discountLabel: "festive",
    netPayable: 25123.99,
    linkValidity: "24 hours",
    expiresAt: futureIso(),
    transactionId: "txn-1",
  };

  it("returns an unexpired program offer", () => {
    const offer = getActiveCoachCheckoutOffer(
      { pendingCoachCheckout: activeOffer },
      "program"
    );
    assert.equal(offer.itemId, "fat-loss");
    assert.equal(getExpiredCoachCheckoutOffer({ pendingCoachCheckout: activeOffer }, "program"), null);
  });

  it("treats an expired offer as inactive", () => {
    const expired = { ...activeOffer, expiresAt: pastIso() };
    assert.equal(getActiveCoachCheckoutOffer({ pendingCoachCheckout: expired }, "program"), null);
    assert.equal(getExpiredCoachCheckoutOffer({ pendingCoachCheckout: expired }, "program")?.itemId, "fat-loss");
    assert.equal(isCheckoutOfferExpired(expired), true);
  });

  it("ignores subscription offers when asking for a program", () => {
    const offer = getActiveCoachCheckoutOffer(
      { pendingCoachCheckout: { ...activeOffer, productType: "subscription" } },
      "program"
    );
    assert.equal(offer, null);
  });
});

describe("coach program offer DTO", () => {
  it("maps a stable payable DTO from the stored offer", () => {
    const dto = toPublicCoachProgramOffer({
      productType: "program",
      itemId: "diabetes",
      itemName: "Diabetes Reversal",
      amount: 29999,
      discountPercent: 10,
      discountLabel: "standard",
      netPayable: 31858.94,
      linkValidity: "48 hours",
      expiresAt: "2026-08-18T12:00:00.000Z",
      appHealValidity: "1 year",
      transactionId: "txn-9",
    });

    assert.deepEqual(dto, {
      source: "coach_checkout",
      productType: "program",
      itemId: "diabetes",
      itemName: "Diabetes Reversal",
      amount: 29999,
      discountPercent: 10,
      discountLabel: "standard",
      netPayable: 31858.94,
      linkValidity: "48 hours",
      expiresAt: "2026-08-18T12:00:00.000Z",
      appHealValidity: "1 year",
      bundledSubscription: null,
      transactionId: "txn-9",
      payable: true,
    });
  });

  it("exposes a bundled FY app subscription included in the same price", () => {
    const dto = toPublicCoachProgramOffer({
      productType: "program",
      itemId: "diabetes",
      itemName: "Diabetes Reversal",
      amount: 29999,
      netPayable: 27000,
      bundledSubscription: {
        enabled: true,
        kind: "fy_energy_exchange",
        itemId: "fy-current",
        itemName: "Current financial year app subscription",
        fyOffsets: [0],
        monthlyAmount: 200,
      },
      transactionId: "txn-10",
    });

    assert.deepEqual(dto.bundledSubscription, {
      kind: "fy_energy_exchange",
      itemId: "fy-current",
      itemName: "Current financial year app subscription",
      fyOffsets: [0],
      monthlyAmount: 200,
      includedInProgramPrice: true,
    });
  });

  it("prefers the pending offer over a catalog assignment on GET", () => {
    const payload = buildUserProgramGetPayload({
      user: { programPurchased: false },
      assignedProgram: { id: "assigned-1", title: "Catalog", enabled: true },
      offer: {
        productType: "program",
        itemId: "fat-loss",
        itemName: "Fat Loss",
        amount: 24999,
        discountPercent: 15,
        netPayable: 25123.99,
        expiresAt: futureIso(),
        transactionId: "txn-1",
      },
    });

    assert.equal(payload.enabled, true);
    assert.equal(payload.payable, true);
    assert.equal(payload.program.source, "coach_checkout");
    assert.equal(payload.program.id, "fat-loss");
    assert.equal(payload.program.price, 25123.99);
    assert.equal(payload.program.listPrice, 24999);
    assert.equal(payload.offer.netPayable, 25123.99);
    assert.equal(payload.offer.transactionId, "txn-1");
  });

  it("uses pricing.netPayable and exposes the amount breakdown on GET", () => {
    const payload = buildUserProgramGetPayload({
      user: { programPurchased: false },
      offer: {
        productType: "program",
        itemId: "thyroid",
        itemName: "Thyroid Care",
        amount: 22999,
        discountPercent: 20,
        discountLabel: "annual plan",
        netPayable: 22999,
        expiresAt: futureIso(),
        transactionId: "txn-2",
      },
      pricing: {
        currency: "INR",
        baseAmount: 22999,
        discountPercent: 20,
        discountLabel: "annual plan",
        discountAmount: 4599.8,
        taxAmount: 0,
        gstAmount: 0,
        totalAmount: 18399.2,
        netPayable: 18399.2,
        lines: [
          { key: "base", label: "Base amount", amount: 22999 },
          { key: "discount", label: "Discount (20% · annual plan)", amount: -4599.8 },
          { key: "gst", label: "GST", amount: 0 },
          { key: "total", label: "Payable", amount: 18399.2 },
        ],
      },
    });

    assert.equal(payload.program.price, 18399.2);
    assert.equal(payload.program.listPrice, 22999);
    assert.equal(payload.offer.netPayable, 18399.2);
    assert.equal(payload.pricing.baseAmount, 22999);
    assert.equal(payload.pricing.discountAmount, 4599.8);
    assert.equal(payload.pricing.gstAmount, 0);
    assert.equal(payload.pricing.lines[0].key, "base");
  });

  it("keeps the catalog assignment when no offer exists", () => {
    const payload = buildUserProgramGetPayload({
      user: { programPurchased: false },
      assignedProgram: { id: "assigned-1", title: "Catalog", enabled: true },
    });
    assert.equal(payload.program.id, "assigned-1");
    assert.equal(payload.offer, null);
    assert.equal(payload.enabled, true);
  });
});

describe("coach hierarchy for checkout trigger", () => {
  const user = {
    id: "user-1",
    parentCoachId: "coach-1",
    assignedCoachId: "awc-1",
    assignedCoachType: "assistant_wellness_coach",
  };

  it("allows the assigned wellness coach and admin", () => {
    assert.equal(canActorTriggerCheckout({ id: "coach-1", role: "wellness_coach" }, user), true);
    assert.equal(canActorTriggerCheckout({ id: "admin-1", role: "admin" }, user), true);
  });

  it("rejects another wellness coach", () => {
    assert.equal(canActorTriggerCheckout({ id: "coach-2", role: "wellness_coach" }, user), false);
  });

  it("allows the assigned assistant and rejects others", () => {
    assert.equal(
      canActorTriggerCheckout(
        { id: "awc-1", role: "assistant_wellness_coach", parentCoachId: "coach-1" },
        user
      ),
      true
    );
    assert.equal(
      canActorTriggerCheckout(
        { id: "awc-2", role: "assistant_wellness_coach", parentCoachId: "coach-1" },
        user
      ),
      false
    );
  });

  it("derives coach ids from the actor when the form omits them", () => {
    const ids = deriveCheckoutCoachIds({
      actor: { id: "coach-1", role: "wellness_coach" },
      user,
    });
    assert.equal(ids.parentCoachId, "coach-1");
    assert.equal(ids.assistantCoachId, "awc-1");
    assert.equal(ids.meetingAssigneeType, "assistant_wellness_coach");
  });
});

describe("checkout payment history rows", () => {
  it("maps a pending program checkout to awaiting history", () => {
    const row = toCheckoutHistoryRow({
      id: "txn-1",
      productType: "program",
      paymentStatus: "pending",
      baseAmount: 24999,
      discountAmount: 3749.85,
      totalAmount: 22311.61,
      createdAt: "2026-08-18T05:21:58.396Z",
      userSnapshot: { catalogItemName: "Fat Loss" },
      checkoutOffer: true,
      linkExpiresAt: futureIso(),
      referenceNumber: "WD20260818ABC",
    });

    assert.equal(row.program, "Fat Loss");
    assert.equal(row.status, "awaiting");
    assert.equal(row.detail, "Triggered to app · Invoice on payment");
    assert.equal(row.amount, 22311.61);
    assert.equal(row.listed, 24999);
    assert.equal(row.discountPct, 15);
  });

  it("maps a paid program checkout to invoice-ready history", () => {
    const row = toCheckoutHistoryRow({
      id: "txn-2",
      productType: "program",
      paymentStatus: "paid",
      paymentMethod: "upi",
      paymentProvider: "mock",
      baseAmount: 24999,
      discountAmount: 3749.85,
      totalAmount: 22311.61,
      paidAt: "2026-08-18T06:00:00.000Z",
      createdAt: "2026-08-18T05:21:58.396Z",
      userSnapshot: { catalogItemName: "Fat Loss" },
      referenceNumber: "WD20260818ABC",
    });

    assert.equal(row.status, "paid");
    assert.equal(row.detail, "upi · mock · WD20260818ABC");
  });

  it("allows a reminder only for unexpired pending checkouts", () => {
    const pending = {
      productType: "program",
      paymentStatus: "pending",
      linkExpiresAt: futureIso(),
    };
    assert.equal(checkoutReminderBlockReason(pending), null);
    assert.equal(
      checkoutReminderBlockReason({ ...pending, paymentStatus: "paid" }),
      "This payment is already complete"
    );
    assert.equal(
      checkoutReminderBlockReason({ ...pending, linkExpiresAt: pastIso() }),
      "Payment link expired. Trigger a new payment."
    );
  });
});

describe("pending order reuse", () => {
  it("reuses a pending checkout order that still has a gateway id and is unexpired", () => {
    assert.equal(
      isPendingCheckoutOrderReusable({
        paymentStatus: "pending",
        paymentGatewayOrderId: "order_mock_1",
        linkExpiresAt: futureIso(),
      }),
      true
    );
  });

  it("does not reuse an expired pending checkout order", () => {
    assert.equal(
      isPendingCheckoutOrderReusable({
        paymentStatus: "pending",
        paymentGatewayOrderId: "order_mock_1",
        checkoutOffer: true,
        linkExpiresAt: pastIso(),
      }),
      false
    );
  });
});

describe("PWC staff referral display", () => {
  const staff = {
    coaches: [{ id: "coach-1", name: "Rahul Mehta", referralCode: "IRW-WC-980" }],
    assistants: [{ id: "awc-1", name: "E", referralCode: "IRW-AWC-470", wellnessCoachId: "coach-1" }],
  };

  it("uses the WC/AWC code the client was referred with", () => {
    assert.equal(
      resolvePwcStaffReferralCode({ referredByCode: "IRW-WC-980", referralCode: "LLSC4Y8F" }, staff),
      "IRW-WC-980"
    );
  });

  it("uses the assigned assistant's AWC code when referredBy is not staff", () => {
    assert.equal(
      resolvePwcStaffReferralCode(
        {
          referralCode: "7WDW4JST",
          assignedCoachId: "awc-1",
          assignedCoachType: "assistant_wellness_coach",
          parentCoachId: "coach-1",
        },
        staff
      ),
      "IRW-AWC-470"
    );
  });

  it("falls back to the assigned wellness coach code", () => {
    assert.equal(
      resolvePwcStaffReferralCode(
        {
          referralCode: "8TAJKDAQ",
          assignedCoachId: "coach-1",
          assignedCoachType: "wellness_coach",
          parentCoachId: "coach-1",
        },
        staff,
        "coach-1"
      ),
      "IRW-WC-980"
    );
  });

  it("does not display the client's own 8-character code", () => {
    assert.equal(resolvePwcStaffReferralCode({ referralCode: "CSUYX8HL" }, staff), "");
  });
});
