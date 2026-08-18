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
    assert.equal(pricing.discountAmount, 100);
    assert.equal(pricing.discountedBase, 900);
    assert.equal(pricing.taxAmount, 162);
    assert.equal(pricing.totalAmount, 1062);
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
      transactionId: "txn-9",
      payable: true,
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
    assert.equal(payload.offer.transactionId, "txn-1");
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
