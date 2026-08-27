const { getAppConfig } = require("../models/appConfigModel");
const {
  getActiveCashfreeGateway,
  roundMoney,
  parseMoney,
} = require("./consultancyPricingService");
const {
  getCouponByCode,
  couponAppliesToChallenge,
  computeCouponDiscount,
  normalizeCouponCode,
} = require("../models/couponModel");
const {
  getChallengeById,
  getChallengeRecordById,
  incrementChallengeEnrollmentCount,
} = require("../models/challengeModel");
const {
  createEnrollment,
  findActiveOrBookedEnrollment,
  updateEnrollment,
} = require("../models/challengeEnrollmentModel");
const { getUserById } = require("../models/userModel");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  listTransactionsByUserId,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  createCashfreeOrder,
  verifyCashfreePayment,
  buildClientPaymentPayload,
} = require("../utils/paymentGateway");
const { ensureCashfreeCheckoutOrder } = require("./paymentOrderHelpers");
const { sendChallengePaymentWhatsApp } = require("../utils/whatsapp");
const {
  isHealTier,
  isMaintenanceTier,
  normalizeUserTier,
} = require("../models/userAssignmentLogic");
const { snapshotAccessState } = require("../utils/challengeOnboardingHelpers");
const { emitPaymentReceived } = require("./adminActivityService");

function logPaymentFailure({ transactionId, userId, reason }) {
  console.error("[ChallengePayment] payment failed", {
    transactionId,
    userId,
    productType: "challenge",
    reason,
    timestamp: new Date().toISOString(),
  });
}

function isOriginallyPaidUser(user) {
  if (!user) return false;
  if (isHealTier(user.userTier)) return true;
  if (Boolean(user.programPurchased)) return true;
  if (isMaintenanceTier(user.userTier) && Number(user.subscriptionDaysLeft) > 0) {
    return true;
  }
  if (user.challengeTemporaryAccess?.challengeId) return true;
  return false;
}

function calculateChallengePricing(appConfig, basePrice, discountAmount = 0) {
  const baseAmount = roundMoney(parseMoney(basePrice));
  const discount = roundMoney(Math.min(baseAmount, Math.max(0, Number(discountAmount) || 0)));
  const discountedBase = roundMoney(Math.max(0, baseAmount - discount));
  const taxPercent = parseMoney(appConfig?.tax_value);
  const taxType = String(appConfig?.tax_type || "exclusive").toLowerCase();

  let taxAmount;
  let totalAmount;
  if (taxType === "inclusive") {
    totalAmount = discountedBase;
    taxAmount =
      taxPercent > 0
        ? roundMoney(totalAmount - totalAmount / (1 + taxPercent / 100))
        : 0;
  } else {
    taxAmount = roundMoney(discountedBase * (taxPercent / 100));
    totalAmount = roundMoney(discountedBase + taxAmount);
  }

  return {
    baseAmount,
    discountAmount: discount,
    discountedBase,
    taxAmount,
    taxPercent,
    taxType,
    totalAmount,
    currency: "INR",
  };
}

async function resolveChallengeCoupon(couponCode, challengeId, baseAmount) {
  const code = normalizeCouponCode(couponCode);
  if (!code) {
    return { coupon: null, couponCode: null, discountAmount: 0, valid: false };
  }
  const coupon = await getCouponByCode(code);
  if (!couponAppliesToChallenge(coupon, challengeId)) {
    const err = new Error("Invalid or inapplicable coupon code");
    err.name = "InvalidCouponError";
    throw err;
  }
  return {
    coupon,
    couponCode: code,
    discountAmount: computeCouponDiscount(baseAmount, coupon),
    valid: true,
  };
}

async function previewChallengeCheckout(challengeId, { couponCode } = {}) {
  const challenge = await getChallengeById(challengeId);
  if (!challenge || challenge.status !== "published") {
    const err = new Error("Challenge not found or not available");
    err.name = "NotFoundError";
    throw err;
  }

  const appConfig = await getAppConfig();
  if (!appConfig) {
    const err = new Error("App configuration not found");
    err.name = "ConfigNotFoundError";
    throw err;
  }

  const couponResult = await resolveChallengeCoupon(
    couponCode,
    challengeId,
    challenge.price
  );
  const pricing = calculateChallengePricing(
    appConfig,
    challenge.price,
    couponResult.discountAmount
  );
  const gateway = getActiveCashfreeGateway(appConfig);

  return {
    challenge: {
      id: challenge.id,
      title: challenge.title,
      price: challenge.price,
      startDate: challenge.startDate,
      endDate: challenge.endDate,
    },
    pricing,
    couponCode: couponResult.couponCode,
    couponValid: couponResult.valid,
    paymentGateway: gateway
      ? { provider: gateway.provider, mode: gateway.mode }
      : null,
  };
}

async function getPendingChallengeOrderForUser(userId, challengeId) {
  const result = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 30,
    paymentStatus: "pending",
    productType: "challenge",
  });
  return (
    result.items.find(
      (row) =>
        String(row.userSnapshot?.challengeId || "") === String(challengeId || "")
    ) || null
  );
}

async function finalizePaidChallengeTransaction(transaction, { paymentId, provider }) {
  const { item: paidRecord, alreadyPaid } = await markTransactionPaidIfPending(transaction.id, {
    paymentGatewayPaymentId: paymentId,
    paymentProvider: provider,
    paidAt: new Date().toISOString(),
  });

  const paid = paidRecord || transaction;
  const challengeId = paid.userSnapshot?.challengeId;
  const userId = paid.userId;
  if (!userId || !challengeId) {
    const err = new Error("Challenge payment is missing user or challenge reference");
    err.name = "ValidationError";
    throw err;
  }

  const user = await getUserById(userId);
  const challenge = await getChallengeRecordById(challengeId);

  let enrollment = await findActiveOrBookedEnrollment(userId, challengeId);
  if (!enrollment) {
    const wasOriginallyPaid = isOriginallyPaidUser(user);
    enrollment = await createEnrollment({
      challengeId,
      userId,
      status: "booked",
      transactionId: paid.id,
      amountPaid: paid.totalAmount,
      couponCode: paid.referralCodeUsed || null,
      discountAmount: paid.discountAmount,
      wasOriginallyPaid,
      previousUserTier: normalizeUserTier(user?.userTier),
      previousAccessSnapshot: snapshotAccessState(user),
      challengeTitle: challenge?.title || paid.userSnapshot?.challengeTitle || null,
      challengeStartDate: challenge?.startDate || paid.userSnapshot?.startDate || null,
      challengeEndDate: challenge?.endDate || paid.userSnapshot?.endDate || null,
      temporaryAccess: !wasOriginallyPaid,
    });
    try {
      await incrementChallengeEnrollmentCount(challengeId, 1);
    } catch (err) {
      console.error("[ChallengePayment] enrollment count increment failed", err.message);
    }
  } else if (!alreadyPaid) {
    enrollment = await updateEnrollment(enrollment.id, {
      transactionId: paid.id,
      amountPaid: paid.totalAmount,
    });
  }

  let whatsappDelivery = paid.whatsappDelivery || null;
  if (!alreadyPaid) {
    try {
      whatsappDelivery = await sendChallengePaymentWhatsApp({
        user,
        challenge,
        referenceNumber: paid.referenceNumber,
        totalAmount: paid.totalAmount,
        template: challenge?.whatsappMessageTemplate,
      });
    } catch (err) {
      whatsappDelivery = { error: err.message };
    }

    try {
      await updateConsultancyTransaction(paid.id, { whatsappDelivery });
    } catch {
      /* non-fatal */
    }

    try {
      await emitPaymentReceived({
        user,
        amount: paid.totalAmount,
        productLabel: "Challenge",
        transactionId: paid.id,
      });
    } catch {
      /* non-fatal */
    }
  }

  return {
    transaction: toPublicTransaction({ ...paid, whatsappDelivery }),
    enrollment,
  };
}

async function createChallengeOrder(
  userId,
  challengeId,
  { paymentMethod = "upi", couponCode } = {}
) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const existingEnrollment = await findActiveOrBookedEnrollment(userId, challengeId);
  if (existingEnrollment) {
    const err = new Error("You are already enrolled in this challenge");
    err.name = "AlreadyEnrolledError";
    throw err;
  }

  const preview = await previewChallengeCheckout(challengeId, { couponCode });
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const existingPending = await getPendingChallengeOrderForUser(userId, challengeId);
  const appConfig = await getAppConfig();
  const gateway = getActiveCashfreeGateway(appConfig);

  if (existingPending) {
    let reusable = existingPending;
    const amountOrCouponChanged =
      Number(existingPending.totalAmount) !== Number(preview.pricing.totalAmount) ||
      String(existingPending.referralCodeUsed || "") !== String(preview.couponCode || "");

    if (amountOrCouponChanged) {
      reusable = await updateConsultancyTransaction(existingPending.id, {
        ...preview.pricing,
        referralCodeUsed: preview.couponCode,
        referralCodeValid: preview.couponValid,
      });
    }

    const ensured = await ensureCashfreeCheckoutOrder({
      transaction: reusable,
      user,
      gateway,
      amountInRupees: preview.pricing.totalAmount,
      forceRecreate: amountOrCouponChanged,
      notes: { productType: "challenge", challengeId },
    });

    return {
      transaction: toPublicTransaction(ensured.transaction),
      pricing: preview.pricing,
      challenge: preview.challenge,
      payment: buildClientPaymentPayload({
        gateway,
        order: ensured.order,
        extras: {
          reusedPendingOrder: true,
          repairedPendingOrder: ensured.repaired,
        },
      }),
    };
  }

  const transaction = await createConsultancyTransaction({
    userId,
    productType: "challenge",
    paymentStatus: "pending",
    paymentProvider: "cashfree",
    paymentMethod,
    ...preview.pricing,
    referralCodeUsed: preview.couponCode,
    referralCodeValid: preview.couponValid,
    userSnapshot: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      userTier: user.userTier,
      challengeId,
      challengeTitle: preview.challenge.title,
      startDate: preview.challenge.startDate,
      endDate: preview.challenge.endDate,
    },
  });

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
    notes: { productType: "challenge", challengeId, userId },
  });

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
    paymentGatewaySessionId: order.payment_session_id || null,
  });

  return {
    transaction: toPublicTransaction(updated),
    pricing: preview.pricing,
    challenge: preview.challenge,
    payment: buildClientPaymentPayload({ gateway, order }),
  };
}

async function verifyChallengePayment(
  userId,
  {
    transactionId,
    orderId,
    paymentId: clientPaymentId,
    razorpay_order_id,
    razorpay_payment_id,
  }
) {
  const transaction = await getConsultancyTransactionById(transactionId);
  if (!transaction || transaction.userId !== userId) {
    const err = new Error("Transaction not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (String(transaction.productType || "").toLowerCase() !== "challenge") {
    const err = new Error("Invalid transaction type");
    err.name = "ValidationError";
    throw err;
  }
  if (transaction.paymentStatus === "paid") {
    // Prior failed finalize may have marked paid without creating enrollment — repair on retry.
    return finalizePaidChallengeTransaction(transaction, {
      paymentId:
        transaction.paymentGatewayPaymentId ||
        clientPaymentId ||
        razorpay_payment_id ||
        `pay_repair_${Date.now()}`,
      provider: transaction.paymentProvider || "cashfree",
    });
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
    logPaymentFailure({
      transactionId,
      userId,
      reason: "Payment verification failed",
    });
    await updateConsultancyTransaction(transactionId, {
      paymentStatus: "failed",
      failureReason: "Payment verification failed",
      failedAt: new Date().toISOString(),
    });
    const err = new Error("Payment verification failed");
    err.name = "PaymentVerificationError";
    throw err;
  }

  return finalizePaidChallengeTransaction(transaction, {
    paymentId,
    provider: "cashfree",
  });
}

module.exports = {
  isOriginallyPaidUser,
  calculateChallengePricing,
  previewChallengeCheckout,
  createChallengeOrder,
  verifyChallengePayment,
  finalizePaidChallengeTransaction,
};
