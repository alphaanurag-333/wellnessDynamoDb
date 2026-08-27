const {
  createCashfreeOrder,
  buildClientPaymentPayload,
} = require("../utils/paymentGateway");
const { updateConsultancyTransaction } = require("../models/consultancyTransactionModel");

function isLegacyMockOrderId(orderId) {
  return String(orderId || "").startsWith("order_mock_");
}

/**
 * Ensures a pending transaction has a usable Cashfree checkout order.
 * Recreates when missing order/session, leftover mock ids, or forceRecreate is set
 * (e.g. payable amount / coupon changed).
 */
async function ensureCashfreeCheckoutOrder({
  transaction,
  user = null,
  gateway,
  amountInRupees,
  notes = {},
  forceRecreate = false,
}) {
  if (!transaction?.id) {
    throw new Error("transaction is required");
  }

  const hasOrderId = Boolean(transaction.paymentGatewayOrderId);
  const hasSession = Boolean(transaction.paymentGatewaySessionId);
  const needsNew =
    forceRecreate ||
    !hasOrderId ||
    !hasSession ||
    isLegacyMockOrderId(transaction.paymentGatewayOrderId);

  if (!needsNew) {
    return {
      transaction,
      order: {
        id: transaction.paymentGatewayOrderId,
        payment_session_id: transaction.paymentGatewaySessionId || null,
        amount: Math.round(Number(amountInRupees) * 100),
        currency: transaction.currency || "INR",
        provider: "cashfree",
      },
      repaired: false,
    };
  }

  const order = await createCashfreeOrder({
    gateway,
    amountInRupees,
    receipt: transaction.referenceNumber,
    customer: {
      id: user?.id || transaction.userId,
      phone: user?.phone || transaction.userSnapshot?.phone,
      email: user?.email || transaction.userSnapshot?.email,
      name: user?.name || transaction.userSnapshot?.name,
    },
    notes: {
      transactionId: transaction.id,
      userId: user?.id || transaction.userId,
      ...notes,
    },
  });

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
    paymentGatewaySessionId: order.payment_session_id || null,
    paymentProvider: "cashfree",
    failureReason: null,
    failedAt: null,
  });

  return {
    transaction: updated,
    order,
    repaired: true,
  };
}

function buildPaymentResponse({ gateway, order, extras = {} }) {
  return buildClientPaymentPayload({ gateway, order, extras });
}

module.exports = {
  ensureCashfreeCheckoutOrder,
  buildPaymentResponse,
};
