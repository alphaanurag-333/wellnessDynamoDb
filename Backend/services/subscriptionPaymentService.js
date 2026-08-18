const { getAppConfig } = require("../models/appConfigModel");
const config = require("../config");
const { getUserById, updateUser } = require("../models/userModel");
const { convertSeekToHeal, convertHealToMaintenance } = require("../models/userConversionModel");
const {
  isConsultancyOnlyTier,
  isHealTier,
  isMaintenanceTier,
} = require("../models/userAssignmentLogic");
const { buildSubscriptionCheckoutPreview } = require("../services/subscriptionPricingService");
const { resolveSubscriptionPlanForPayment } = require("../services/subscriptionCategoryService");
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
const { emitPaymentReceived } = require("./adminActivityService");
const {
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  isPendingCheckoutOrderReusable,
  toPublicCoachProgramOffer,
} = require("./coachCheckoutService");

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

  const expiredOffer = getExpiredCoachCheckoutOffer(user, "subscription");
  if (expiredOffer) {
    const err = new Error("This payment link has expired");
    err.name = "ValidationError";
    throw err;
  }

  const offer = getActiveCoachCheckoutOffer(user, "subscription");
  const plan = await resolveSubscriptionPlanForPayment({
    catalogItemId: offer?.itemId || null,
    catalogItemName: offer?.itemName || "",
  });

  if (plan.kind === "maintenance") {
    if (!isHealTier(user.userTier) && !isMaintenanceTier(user.userTier)) {
      const err = new Error("Maintenance plan is available after the Heal course period ends");
      err.name = "ValidationError";
      throw err;
    }
  } else {
    if (isHealTier(user.userTier) || isMaintenanceTier(user.userTier)) {
      const err = new Error("Subscription is already active for this account");
      err.name = "AlreadyConvertedError";
      throw err;
    }
    if (!offer && !isConsultancyOnlyTier(user.userTier)) {
      const err = new Error("Complete consultancy payment before subscribing to Seek to Heal");
      err.name = "ConsultancyRequiredError";
      throw err;
    }
  }

  const existingPending = await getPendingSubscriptionOrderForUser(userId);
  const previewForReuse = existingPending ? await buildSubscriptionCheckoutPreview(userId) : null;
  if (
    isPendingCheckoutOrderReusable(existingPending) &&
    previewForReuse &&
    Number(existingPending.totalAmount) === Number(previewForReuse.pricing.totalAmount)
  ) {
    const appConfig = await getAppConfig();
    const gateway = getActiveRazorpayGateway(appConfig);
    const useMock = shouldUseMockPayments(gateway);
    const publicOffer = offer ? toPublicCoachProgramOffer(offer) : null;
    return {
      transaction: toPublicTransaction(existingPending),
      pricing: {
        baseAmount: existingPending.baseAmount,
        discountAmount: existingPending.discountAmount,
        discountedBase: existingPending.discountedBase,
        taxAmount: existingPending.taxAmount,
        taxPercent: existingPending.taxPercent,
        taxType: existingPending.taxType,
        totalAmount: existingPending.totalAmount,
        currency: existingPending.currency || "INR",
      },
      subscription: publicOffer
        ? {
            id: publicOffer.itemId,
            name: publicOffer.itemName,
            amount: publicOffer.amount,
            currency: existingPending.currency || "INR",
            source: "coach_checkout",
          }
        : null,
      offer: publicOffer,
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

  if (
    existingPending?.checkoutOffer &&
    existingPending.linkExpiresAt &&
    new Date(existingPending.linkExpiresAt).getTime() <= Date.now()
  ) {
    const err = new Error("This payment link has expired");
    err.name = "ValidationError";
    throw err;
  }

  const preview = await buildSubscriptionCheckoutPreview(userId);
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
    parentCoachId: user.parentCoachId || offer?.wellnessCoachId || null,
    checkoutOffer: preview.source === "coach_checkout",
    linkExpiresAt: offer?.expiresAt || null,
    userSnapshot: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      userTier: user.userTier,
      catalogItemId: offer?.itemId || preview.subscription?.id || null,
      catalogItemName: offer?.itemName || preview.subscription?.name || "",
      planKind: plan.kind,
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
        catalogItemId: offer?.itemId || preview.subscription?.id || "",
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
      subscription: preview.subscription,
      offer: preview.offer || null,
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
    subscription: preview.subscription,
    offer: preview.offer || null,
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

async function resolveSubscriptionPlanFromTransaction(transaction) {
  const snapshot = transaction?.userSnapshot || {};
  return resolveSubscriptionPlanForPayment({
    catalogItemId: snapshot.catalogItemId || null,
    catalogItemName: snapshot.catalogItemName || "",
  });
}

async function applyPaidSubscriptionOutcome(user, plan) {
  if (plan.kind === "maintenance") {
    if (isMaintenanceTier(user.userTier)) return;
    try {
      await convertHealToMaintenance(user.id);
    } catch (err) {
      console.error("[SubscriptionPayment] convertHealToMaintenance failed", err.message);
      throw err;
    }
    return;
  }

  try {
    await convertSeekToHeal(user.id);
  } catch (err) {
    if (err?.name !== "AlreadyConvertedError") {
      console.error("[SubscriptionPayment] convertSeekToHeal failed", err.message);
      throw err;
    }
  }
}

async function finalizePaidSubscriptionTransaction(transaction, { paymentId, provider }) {
  const user = await getUserById(transaction.userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const plan = await resolveSubscriptionPlanFromTransaction(transaction);
  const paidAt = new Date().toISOString();
  const { item: paidRecord, alreadyPaid } = await markTransactionPaidIfPending(transaction.id, {
    paymentGatewayPaymentId: paymentId || null,
    paymentProvider: provider,
    paidAt,
    userSnapshot: {
      ...(transaction.userSnapshot || {}),
      userTier: plan.userTier,
      clientCategory: plan.clientCategory,
      planKind: plan.kind,
    },
  });

  if (alreadyPaid) {
    return toPublicTransaction(paidRecord);
  }

  emitPaymentReceived({
    user,
    amount: transaction.totalAmount,
    productLabel: plan.kind === "maintenance" ? "Maintenance" : "Subscription",
    transactionId: transaction.id,
  });

  await applyPaidSubscriptionOutcome(user, plan);

  await updateUser(user.id, {
    pendingCoachCheckout: {},
    ...(plan.clientCategory === "eagle" ? { clientCategory: "eagle" } : {}),
  });

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

async function previewSubscriptionCheckout(userId) {
  return buildSubscriptionCheckoutPreview(userId);
}

module.exports = {
  previewSubscriptionCheckout,
  createSubscriptionOrder,
  verifySubscriptionPayment,
  finalizePaidSubscriptionTransaction,
  resolveSubscriptionPlanFromTransaction,
};
