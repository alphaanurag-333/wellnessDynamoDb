const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const {
  createMockOrder,
  verifyMockPayment,
} = require("../utils/paymentGateway");

describe("development mock payment gateway", () => {
  it("creates verifiable mock order IDs", () => {
    const order = createMockOrder({
      amountInRupees: 313.95,
      receipt: "WD-DEV-TEST",
    });

    assert.match(order.id, /^order_mock_\d+$/);
    assert.equal(order.amount, 31395);
    assert.equal(order.provider, "mock");
    assert.equal(verifyMockPayment({ orderId: order.id }), true);
  });

  it("rejects non-mock order IDs", () => {
    assert.equal(verifyMockPayment({ orderId: "" }), false);
    assert.equal(verifyMockPayment({ orderId: "order_razorpay_test" }), false);
  });
});
