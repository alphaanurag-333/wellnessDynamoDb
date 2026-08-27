const { getAppConfig } = require("../models/appConfigModel");
const { getUserById, updateUser } = require("../models/userModel");
const { convertSeekToHeal } = require("../models/userConversionModel");
const { isConsultancyOnlyTier, isHealTier, isMaintenanceTier } = require("../models/userAssignmentLogic");
const { ensureEnergyExchangeProgramForUser } = require("./energyExchangeEntitlementService");
const { getActiveCashfreeGateway } = require("./consultancyPricingService");
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
  createCashfreeOrder,
  verifyCashfreePayment,
  buildClientPaymentPayload,
} = require("../utils/paymentGateway");
const { emitPaymentReceived } = require("./adminActivityService");
const { buildPaidOnboardingResetUpdates } = require("../utils/paidOnboardingHelpers");
const {
  toPublicTransactionWithInvoice,
} = require("../utils/consultancyInvoiceResponse");

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

  const isMaintenance = isMaintenanceTier(user.userTier);

  if (isMaintenance) {
    // Maintenance renewals: FY app subscription only (no Heal conversion).
    await ensureEnergyExchangeProgramForUser(user);
  } else {
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

    if (!user.programPurchased) {
      const err = new Error("Complete your Wellness Program purchase before Energy Exchange");
      err.name = "ProgramRequiredError";
      throw err;
    }
  }

  const preview = await previewEnergyExchangeCheckout(userId, { fyStartYears });
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveCashfreeGateway(appConfig);

  const transaction = await createConsultancyTransaction({
    userId,
    productType: "energy_exchange",
    paymentStatus: "pending",
    paymentProvider: "cashfree",
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

  const order = await createCashfreeOrder({
    gateway,
    amountInRupees: preview.pricing.totalAmount,
    receipt: transaction.referenceNumber,
    customer: {
      id: user.id,
      phone: user.phone,
      email: user.email,
      name: user.name,
    },
    notes: {
      transactionId: transaction.id,
      userId,
      productType: "energy_exchange",
      fyStartYears: fyStartYears.join(","),
    },
  });

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
    paymentGatewaySessionId: order.payment_session_id || null,
  });

  return {
    transaction: toPublicTransaction(updated),
    pricing: preview.pricing,
    plans: preview.plans,
    payment: buildClientPaymentPayload({ gateway, order }),
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

  const isMaintenance = isMaintenanceTier(user.userTier);
  const paidAt = new Date().toISOString();
  const { item: paidRecord, alreadyPaid } = await markTransactionPaidIfPending(transaction.id, {
    paymentGatewayPaymentId: paymentId || null,
    paymentProvider: provider,
    paidAt,
    userSnapshot: {
      ...(transaction.userSnapshot || {}),
      userTier: isMaintenance ? "maintenance" : "heal",
    },
  });

  if (alreadyPaid) {
    return toPublicTransactionWithInvoice(paidRecord);
  }

  emitPaymentReceived({
    user,
    amount: transaction.totalAmount,
    productLabel: "Energy Exchange",
    transactionId: transaction.id,
  });

  await _activateSubscriptionsForTransaction(transaction.id);

  if (isMaintenance) {
    // Renewals: keep Maintenance tier and existing paid onboarding.
    await updateUser(user.id, {
      energyExchangeEnabled: true,
      pendingCoachCheckout: {},
    });
  } else {
    try {
      await convertSeekToHeal(user.id);
    } catch (err) {
      if (err?.name !== "AlreadyConvertedError") {
        console.error("[EnergyExchangePayment] convertSeekToHeal failed", err.message);
        throw err;
      }
    }

    // Never restart paid onboarding if the client already finished it (e.g. renewals).
    if (user.paidOnboardingCompleted) {
      await updateUser(user.id, {
        energyExchangeEnabled: true,
        healPaidAt: user.healPaidAt || paidAt,
        pendingCoachCheckout: {},
      });
    } else {
      await updateUser(user.id, {
        ...buildPaidOnboardingResetUpdates(),
        healPaidAt: paidAt,
        energyExchangeEnabled: true,
      });
    }
  }

  const fresh = await getConsultancyTransactionById(transaction.id);
  return toPublicTransactionWithInvoice(fresh);
}

async function verifyEnergyExchangePayment(userId, {
  transactionId,
  orderId,
  paymentId: clientPaymentId,
  razorpay_order_id,
  razorpay_payment_id,
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
    return toPublicTransactionWithInvoice(transaction);
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveCashfreeGateway(appConfig);
  const resolvedOrderId = orderId || razorpay_order_id || transaction.paymentGatewayOrderId;

  if (!gateway) {
    const err = new Error("Payment gateway is not configured");
    err.name = "PaymentGatewayError";
    throw err;
  }
  if (!resolvedOrderId) {
    const err = new Error("orderId is required");
    err.name = "ValidationError";
    throw err;
  }

  const result = await verifyCashfreePayment({ gateway, orderId: resolvedOrderId });
  const verified = result.verified;
  const paymentId = clientPaymentId || razorpay_payment_id || result.paymentId || null;

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
    provider: "cashfree",
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
