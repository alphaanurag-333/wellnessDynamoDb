const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  buildClientPaymentPayload,
  cashfreeBaseUrl,
  resolveVerifyPaymentFields,
} = require("../utils/paymentGateway");

describe("cashfree helpers", () => {
  it("resolves UAT and Live base URLs", () => {
    assert.equal(cashfreeBaseUrl("uat"), "https://sandbox.cashfree.com/pg");
    assert.equal(cashfreeBaseUrl("live"), "https://api.cashfree.com/pg");
    assert.equal(cashfreeBaseUrl("anything"), "https://sandbox.cashfree.com/pg");
  });

  it("builds client payment payload for Cashfree", () => {
    const payload = buildClientPaymentPayload({
      gateway: { mode: "uat" },
      order: {
        id: "order_cf_1",
        payment_session_id: "session_abc",
        amount: 10000,
        currency: "INR",
      },
    });
    assert.deepEqual(payload, {
      provider: "cashfree",
      orderId: "order_cf_1",
      paymentSessionId: "session_abc",
      amount: 10000,
      currency: "INR",
      mode: "uat",
    });
  });

  it("resolves verify fields from Cashfree and legacy aliases", () => {
    assert.deepEqual(
      resolveVerifyPaymentFields({ orderId: "o1", paymentId: "p1" }),
      { orderId: "o1", paymentId: "p1" }
    );
    assert.deepEqual(
      resolveVerifyPaymentFields({
        cashfree_order_id: "o2",
        razorpay_payment_id: "p2",
      }),
      { orderId: "o2", paymentId: "p2" }
    );
  });
});
