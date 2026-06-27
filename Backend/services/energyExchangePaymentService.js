const config = require("../config");
const { getAppConfig } = require("../models/appConfigModel");
const { getUserById, updateUser } = require("../models/userModel");
const { convertSeekToHeal } = require("../models/userConversionModel");
const { isConsultancyOnlyTier, isHealTier } = require("../models/userAssignmentLogic");
const { getActiveRazorpayGateway } = require("./consultancyPricingService");
const { previewCheckout } = require("./energyExchangePricingService");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  createSubscription,
  listSubscriptionsByTransactionId,
  updateSubscription,
  toPublicSubscription,
} = require("../models/energyExchangeSubscriptionModel");
const {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  createMockOrder,
  verifyMockPayment,
  shouldUseMockPayments,
} = require("../utils/paymentGateway");

function logPaymentFailure({ transactionId, userId, reason }) {
  console.error("[EnergyExchangePayment] payment failed", {
    transactionId,
    userId,
    productType: "energy_exchange",
    reason,
    timestamp: new Date().toISOString(),
  });
}

async function previewEnergyExchangeCheckout(userId, { fyStartYears } = {}) {
  if (!Array.isArray(fyStartYears) || fyStartYears.length === 0) {
    const err = new Error("fyStartYears must be a non-empty array");
    err.name = "ValidationError";
    throw err;
  }
  return previewCheckout(userId, fyStartYears);
}

async function createEnergyExchangeOrder(userId, { fyStartYears, paymentMethod = "upi" } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (isHealTier(user.userTier)) {
    const err = new Error("Energy Exchange purchase requires a non-heal account");
    err.name = "AlreadyConvertedError";
    throw err;
  }

  if (!isConsultancyOnlyTier(user.userTier)) {
    const err = new Error("Complete consultancy payment before purchasing Energy Exchange");
    err.name = "ConsultancyRequiredError";
    throw err;
  }

  const preview = await previewEnergyExchangeCheckout(userId, { fyStartYears });
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
    productType: "energy_exchange",
    paymentStatus: "pending",
    paymentProvider: useMock ? "mock" : "razorpay",
    paymentMethod,
    baseAmount: preview.pricing.baseAmount,
    discountAmount: preview.pricing.discountAmount,
    discountedBase: preview.pricing.discountedBase,
    taxAmount: preview.pricing.taxAmount,
    taxPercent: preview.pricing.taxPercent,
    taxType: preview.pricing.taxType,
    totalAmount: preview.pricing.totalAmount,
    currency: preview.pricing.currency,
    referralCodeUsed: null,
    referralCodeValid: false,
    parentCoachId: user.parentCoachId || null,
    userSnapshot: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      userTier: user.userTier,
    },
  });

  for (const plan of preview.plans) {
    await createSubscription({
      userId,
      programId: plan.programId,
      transactionId: transaction.id,
      fyStartYear: plan.fyStartYear,
      monthsCovered: plan.monthsCovered,
      monthlyRate: plan.monthlyAmount,
      discountPercent: plan.effectiveDiscountPercent,
      fyTierDiscountPercent: plan.fyTierDiscountPercent,
      timeBasedDiscountPercent: plan.timeBasedDiscountPercent,
      baseAmount: plan.baseAmount,
      discountAmount: plan.discountAmount,
      taxAmount: plan.taxAmount,
      taxPercent: plan.taxPercent,
      taxType: plan.taxType,
      totalAmount: plan.totalAmount,
      currency: plan.currency,
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
      status: "pending",
    });
  }

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
        productType: "energy_exchange",
        fyStartYears: fyStartYears.join(","),
      },
    });
  }

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
  });

  if (useMock && config.autoConfirmMockPayments) {
    const paidTransaction = await finalizePaidEnergyExchangeTransaction(updated, {
      paymentId: `pay_mock_ee_${Date.now()}`,
      provider: "mock",
    });
    return {
      transaction: paidTransaction,
      pricing: preview.pricing,
      plans: preview.plans,
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
    plans: preview.plans,
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

/**
 * After payment is verified, promote subscriptions: earliest by fyStartYear becomes "active",
 * remaining become "queued". Time windows are re-computed for safety so the activation runs
 * from the actual current moment.
 */
async function _activateSubscriptionsForTransaction(transactionId) {
  const subs = await listSubscriptionsByTransactionId(transactionId);
  if (!subs.length) return [];

  const sorted = [...subs].sort((a, b) => Number(a.fyStartYear) - Number(b.fyStartYear));
  const now = new Date().toISOString();

  const promoted = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const sub = sorted[i];
    if (i === 0) {
      const updated = await updateSubscription(sub.id, {
        status: "active",
        activatedAt: now,
      });
      promoted.push(updated);
    } else {
      const updated = await updateSubscription(sub.id, {
        status: "queued",
      });
      promoted.push(updated);
    }
  }
  return promoted;
}

async function finalizePaidEnergyExchangeTransaction(transaction, { paymentId, provider }) {
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

  await _activateSubscriptionsForTransaction(transaction.id);

  try {
    await convertSeekToHeal(user.id);
  } catch (err) {
    if (err?.name !== "AlreadyConvertedError") {
      console.error("[EnergyExchangePayment] convertSeekToHeal failed", err.message);
      throw err;
    }
  }

  await updateUser(user.id, {
    paidOnboardingCompleted: false,
    paidOnboardingStep: "register",
    healPaidAt: paidAt,
  });

  const fresh = await getConsultancyTransactionById(transaction.id);
  return toPublicTransaction(fresh);
}

async function verifyEnergyExchangePayment(userId, {
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
  if (String(transaction.productType || "").toLowerCase() !== "energy_exchange") {
    const err = new Error("Not an energy exchange transaction");
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
    paymentId = paymentId || `pay_mock_ee_${Date.now()}`;
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

  return finalizePaidEnergyExchangeTransaction(transaction, {
    paymentId,
    provider: useMock ? "mock" : "razorpay",
  });
}

async function listSubscriptionsForUserPublic(userId) {
  const { listSubscriptionsByUserId } = require("../models/energyExchangeSubscriptionModel");
  const result = await listSubscriptionsByUserId(userId, { page: 1, limit: 200 });
  return result.items.map(toPublicSubscription);
}

module.exports = {
  previewEnergyExchangeCheckout,
  createEnergyExchangeOrder,
  verifyEnergyExchangePayment,
  finalizePaidEnergyExchangeTransaction,
  listSubscriptionsForUserPublic,
};
