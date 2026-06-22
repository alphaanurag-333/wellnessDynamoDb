const { getAppConfig } = require("../models/appConfigModel");
const config = require("../config");
const { getUserById } = require("../models/userModel");
const { convertSeekToHeal } = require("../models/userConversionModel");
const { isConsultancyOnlyTier, isHealTier } = require("../models/userAssignmentLogic");
const { buildSubscriptionCheckoutPreview } = require("../services/subscriptionPricingService");
const { getActiveRazorpayGateway } = require("../services/consultancyPricingService");
const {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  createMockOrder,
  verifyMockPayment,
  shouldUseMockPayments,
} = require("../utils/paymentGateway");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  listTransactionsByUserId,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");

function logPaymentFailure({ transactionId, userId, reason, productType = "subscription" }) {
  console.error("[SubscriptionPayment] payment failed", {
    transactionId,
    userId,
    productType,
    reason,
    timestamp: new Date().toISOString(),
  });
}

async function getPendingSubscriptionOrderForUser(userId) {
  const result = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 20,
    paymentStatus: "pending",
    productType: "subscription",
  });
  return result.items[0] || null;
}

async function createSubscriptionOrder(userId, { paymentMethod = "upi" } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (isHealTier(user.userTier)) {
    const err = new Error("Subscription is already active for this account");
    err.name = "AlreadyConvertedError";
    throw err;
  }

  if (!isConsultancyOnlyTier(user.userTier)) {
    const err = new Error("Complete consultancy payment before subscribing to Seek to Heal");
    err.name = "ConsultancyRequiredError";
    throw err;
  }

  const existingPending = await getPendingSubscriptionOrderForUser(userId);
  if (existingPending) {
    const appConfig = await getAppConfig();
    const gateway = getActiveRazorpayGateway(appConfig);
    const useMock = shouldUseMockPayments(gateway);
    return {
      transaction: toPublicTransaction(existingPending),
      pricing: {
        baseAmount: existingPending.baseAmount,
        totalAmount: existingPending.totalAmount,
        currency: existingPending.currency || "INR",
      },
      payment: {
        provider: useMock ? "mock" : "razorpay",
        orderId: existingPending.paymentGatewayOrderId,
        amount: Math.round(Number(existingPending.totalAmount) * 100),
        currency: existingPending.currency || "INR",
        keyId: gateway?.keyId || null,
        mockPayment: useMock,
        reusedPendingOrder: true,
      },
    };
  }

  const preview = await buildSubscriptionCheckoutPreview();
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveRazorpayGateway(appConfig);
  const useMock = shouldUseMockPayments(gateway);

  const transaction = await createConsultancyTransaction({
    userId,
    productType: "subscription",
    paymentStatus: "pending",
    paymentProvider: useMock ? "mock" : "razorpay",
    paymentMethod,
    ...preview.pricing,
    referralCodeUsed: null,
    referralCodeValid: false,
    userSnapshot: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      userTier: user.userTier,
    },
  });

  let order;
  if (useMock) {
    order = createMockOrder({
      amountInRupees: preview.pricing.totalAmount,
      receipt: transaction.referenceNumber,
    });
  } else {
    order = await createRazorpayOrder({
      gateway,
      amountInRupees: preview.pricing.totalAmount,
      receipt: transaction.referenceNumber,
      notes: {
        transactionId: transaction.id,
        userId,
        productType: "subscription",
      },
    });
  }

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
  });

  if (useMock && config.autoConfirmMockPayments) {
    const paidTransaction = await finalizePaidSubscriptionTransaction(updated, {
      paymentId: `pay_mock_sub_${Date.now()}`,
      provider: "mock",
    });
    return {
      transaction: paidTransaction,
      pricing: preview.pricing,
      payment: {
        provider: "mock",
        orderId: order.id,
        amount: order.amount,
        currency: order.currency || "INR",
        keyId: gateway?.keyId || null,
        mockPayment: true,
        autoConfirmed: true,
      },
    };
  }

  return {
    transaction: toPublicTransaction(updated),
    pricing: preview.pricing,
    payment: {
      provider: useMock ? "mock" : "razorpay",
      orderId: order.id,
      amount: order.amount,
      currency: order.currency || "INR",
      keyId: gateway?.keyId || null,
      mockPayment: useMock,
    },
  };
}

async function finalizePaidSubscriptionTransaction(transaction, { paymentId, provider }) {
  const user = await getUserById(transaction.userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const paidAt = new Date().toISOString();
  const { item: paidRecord, alreadyPaid } = await markTransactionPaidIfPending(transaction.id, {
    paymentGatewayPaymentId: paymentId || null,
    paymentProvider: provider,
    paidAt,
    userSnapshot: {
      ...(transaction.userSnapshot || {}),
      userTier: "heal",
    },
  });

  if (alreadyPaid) {
    return toPublicTransaction(paidRecord);
  }

  try {
    await convertSeekToHeal(user.id);
  } catch (err) {
    if (err?.name !== "AlreadyConvertedError") {
      console.error("[SubscriptionPayment] convertSeekToHeal failed", err.message);
      throw err;
    }
  }

  const fresh = await getConsultancyTransactionById(transaction.id);
  return toPublicTransaction(fresh);
}

async function verifySubscriptionPayment(userId, {
  transactionId,
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const transaction = await getConsultancyTransactionById(transactionId);
  if (!transaction) {
    const err = new Error("Transaction not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (transaction.userId !== userId) {
    const err = new Error("Forbidden");
    err.name = "ForbiddenError";
    throw err;
  }
  if (String(transaction.productType || "").toLowerCase() !== "subscription") {
    const err = new Error("Not a subscription transaction");
    err.name = "ValidationError";
    throw err;
  }
  if (transaction.paymentStatus === "paid") {
    return toPublicTransaction(transaction);
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveRazorpayGateway(appConfig);
  const useMock = shouldUseMockPayments(gateway);

  let verified = false;
  let paymentId = razorpay_payment_id;

  if (useMock) {
    verified = verifyMockPayment({ orderId: razorpay_order_id || transaction.paymentGatewayOrderId });
    paymentId = paymentId || `pay_mock_sub_${Date.now()}`;
  } else {
    if (!gateway) {
      const err = new Error("Payment gateway is not configured");
      err.name = "PaymentGatewayError";
      throw err;
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const err = new Error("razorpay_order_id, razorpay_payment_id and razorpay_signature are required");
      err.name = "ValidationError";
      throw err;
    }
    verified = verifyRazorpayPaymentSignature({
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      signature: razorpay_signature,
      keySecret: gateway.keySecret,
    });
  }

  if (!verified) {
    const failureReason = "Payment verification failed";
    logPaymentFailure({ transactionId: transaction.id, userId, reason: failureReason });
    await updateConsultancyTransaction(transaction.id, {
      paymentStatus: "failed",
      failureReason,
      failedAt: new Date().toISOString(),
    });
    const err = new Error(failureReason);
    err.name = "PaymentVerificationError";
    throw err;
  }

  return finalizePaidSubscriptionTransaction(transaction, {
    paymentId,
    provider: useMock ? "mock" : "razorpay",
  });
}

async function previewSubscriptionCheckout() {
  return buildSubscriptionCheckoutPreview();
}

module.exports = {
  previewSubscriptionCheckout,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  finalizePaidSubscriptionTransaction,
};
