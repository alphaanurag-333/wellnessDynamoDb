const { getAppConfig } = require("../models/appConfigModel");
const { getUserById, updateUser } = require("../models/userModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { completeConsultancyEnrollment } = require("../models/userConversionModel");
const {
  buildCheckoutPreview,
  getActiveCashfreeGateway,
  isReferralCodeValidForDiscount,
  calculateConsultancyPricing,
} = require("../services/consultancyPricingService");
const { resolveMeetingAssignee } = require("../services/meetingAssigneeService");
const {
  createCashfreeOrder,
  verifyCashfreePayment,
  buildClientPaymentPayload,
} = require("../utils/paymentGateway");
const { ensureCashfreeCheckoutOrder } = require("./paymentOrderHelpers");
const { createZoomMeeting } = require("../utils/zoom");
const { sendConsultancyWhatsAppNotifications } = require("../utils/whatsapp");
const {
  toPublicTransactionWithInvoice,
  ensureTransactionInvoice,
  attachInvoiceUrl,
} = require("../utils/consultancyInvoiceResponse");
const {
  emitPaymentReceived,
  emitPendingAssignment,
} = require("./adminActivityService");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  getPendingConsultancyOrderForUser,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  resolveHealthConcernForConsultancy,
} = require("./consultancyHealthConcern");
const {
  resolveConsultancyPurchaseEligibility,
} = require("./consultancyEligibilityService");

function mapPaymentError(err) {
  if (err?.name === "InvalidReferralCodeError") {
    const e = new Error(err.message);
    e.name = "InvalidReferralCodeError";
    throw e;
  }
  throw err;
}

function logPaymentFailure({ transactionId, userId, reason }) {
  console.error("[ConsultancyPayment] payment failed", {
    transactionId,
    userId,
    reason,
    timestamp: new Date().toISOString(),
  });
}

async function createConsultancyOrder(userId, { referralCode, paymentMethod = "upi", healthConcernId, healthConcernOther } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const eligibility = await resolveConsultancyPurchaseEligibility(user);
  if (!eligibility.canPurchase || !eligibility.purchasableFy) {
    const err = new Error(
      eligibility.reason === "invalid_tier"
        ? "Consultancy payment is not available for this account"
        : "Consultancy payment is not available right now"
    );
    err.name = "AlreadyEnrolledError";
    throw err;
  }

  // FY is derived server-side from eligibility; clients do not select it.
  const targetFy = eligibility.purchasableFy;

  const existingPending = await getPendingConsultancyOrderForUser(userId);
  if (existingPending) {
    const appConfig = await getAppConfig();
    const gateway = getActiveCashfreeGateway(appConfig);

    let reusablePending = existingPending;
    const incomingCode = referralCode ? String(referralCode).trim().toUpperCase() : "";
    const existingCode = existingPending.referralCodeUsed
      ? String(existingPending.referralCodeUsed).trim().toUpperCase()
      : "";
    let pricingChanged = false;
    if (incomingCode && incomingCode !== existingCode) {
      const preview = await buildCheckoutPreview({ referralCode: incomingCode });
      reusablePending = await updateConsultancyTransaction(existingPending.id, {
        ...preview.pricing,
        referralCodeUsed: preview.referralCode,
        referralCodeValid: preview.referralCodeValid,
      });
      pricingChanged = true;
    }

    const ensured = await ensureCashfreeCheckoutOrder({
      transaction: reusablePending,
      user,
      gateway,
      amountInRupees: reusablePending.totalAmount,
      forceRecreate: pricingChanged,
      notes: { productType: "consultancy" },
    });

    const pricingSnapshot = {
      baseAmount: ensured.transaction.baseAmount,
      discountAmount: ensured.transaction.discountAmount,
      discountedBase: ensured.transaction.discountedBase,
      taxAmount: ensured.transaction.taxAmount,
      taxPercent: ensured.transaction.taxPercent,
      taxType: ensured.transaction.taxType,
      totalAmount: ensured.transaction.totalAmount,
      currency: ensured.transaction.currency || "INR",
    };

    return {
      transaction: toPublicTransaction(ensured.transaction),
      pricing: pricingSnapshot,
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

  const healthConcern = await resolveHealthConcernForConsultancy(
    healthConcernId || user.primaryHealthConcern,
    { healthConcernOther },
  );

  const preview = await buildCheckoutPreview({ referralCode });
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveCashfreeGateway(appConfig);

  const transaction = await createConsultancyTransaction({
    userId,
    productType: "consultancy",
    paymentStatus: "pending",
    paymentProvider: "cashfree",
    paymentMethod,
    ...preview.pricing,
    referralCodeUsed: preview.referralCode,
    referralCodeValid: preview.referralCodeValid,
    userSnapshot: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      whatsappSameAsMobile: user.whatsappSameAsMobile,
      whatsappPhone: user.whatsappPhone,
      whatsappCountryCode: user.whatsappCountryCode,
      userTier: user.userTier,
    },
    healthConcernId: healthConcern.healthConcernId,
    healthConcernSnapshot: healthConcern.healthConcernSnapshot,
    fyStartYear: targetFy.fyStartYear,
    fyStartMonth: targetFy.fyStartMonth,
    fyStartsAt: targetFy.startsAt,
    fyEndsAt: targetFy.endsAt,
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
    notes: {
      transactionId: transaction.id,
      userId,
      productType: "consultancy",
    },
  });

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
    paymentGatewaySessionId: order.payment_session_id || null,
  });

  return {
    transaction: toPublicTransaction(updated),
    pricing: preview.pricing,
    payment: buildClientPaymentPayload({ gateway, order }),
  };
}

async function finalizePaidConsultancyTransaction(transaction, { paymentId, provider }) {
  const user = await getUserById(transaction.userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  let assignee;
  try {
    assignee = await resolveMeetingAssignee(
      transaction.referralCodeValid ? transaction.referralCodeUsed : null
    );
  } catch (err) {
    assignee = {
      assigneeType: "admin",
      assigneeId: "admin",
      assignee: { type: "admin", name: "Admin" },
      parentCoachId: null,
      visibleToCoachIds: [],
    };
  }

  try {
    await completeConsultancyEnrollment(user.id, {
      referralCode: transaction.referralCodeUsed || null,
    });
  } catch (err) {
    if (err?.name !== "AlreadyConvertedError") {
      console.error("[ConsultancyPayment] completeConsultancyEnrollment failed", err.message);
      throw err;
    }
  }

  try {
    await updateUser(transaction.userId, {
      primaryHealthConcern: transaction.healthConcernId,
    });
  } catch (err) {
    console.error("[ConsultancyPayment] update user health concern failed", err.message);
  }

  let zoom = null;
  try {
    zoom = await createZoomMeeting({
      topic: `Consultancy — ${user.name || "Client"}`,
      agenda: `Reference ${transaction.referenceNumber}`,
    });
  } catch (err) {
    console.error("[ConsultancyPayment] Zoom failed", err.message);
  }

  const freshUser = (await getUserById(transaction.userId)) || user;
  let parentCoach = null;
  if (assignee.parentCoachId && assignee.assigneeType === "assistant_wellness_coach") {
    parentCoach = await getWellnessCoachRecordById(assignee.parentCoachId);
  }

  const paidAt = new Date().toISOString();
  const paidPayload = {
    paymentGatewayPaymentId: paymentId || null,
    paymentProvider: provider,
    paidAt,
    meetingAssigneeType: assignee.assigneeType,
    meetingAssigneeId: assignee.assigneeId,
    parentCoachId: assignee.parentCoachId,
    visibleToCoachIds: assignee.visibleToCoachIds,
    assigneeSnapshot: assignee.assignee,
    zoomMeetingId: zoom?.id || null,
    zoomMeetingLink: zoom?.join_url || null,
    userSnapshot: {
      ...(transaction.userSnapshot || {}),
      userTier: "consultancy_only",
    },
  };

  const { item: paidRecord, alreadyPaid } = await markTransactionPaidIfPending(transaction.id, paidPayload);

  if (alreadyPaid) {
    return toPublicTransactionWithInvoice(paidRecord);
  }

  emitPaymentReceived({
    user: freshUser,
    amount: transaction.totalAmount,
    productLabel: "Consultancy",
    transactionId: transaction.id,
  });
  if (String(freshUser.assignmentStatus || "").trim() === "pending_admin") {
    emitPendingAssignment(freshUser);
  }

  const withInvoice = await ensureTransactionInvoice(paidRecord);
  const invoiceUrl = attachInvoiceUrl(withInvoice)?.invoiceUrl || null;
  const healthConcernTitle =
    String(transaction.healthConcernSnapshot?.title || "").trim() ||
    String(paidRecord.healthConcernSnapshot?.title || "").trim();

  let whatsappDelivery = null;
  try {
    whatsappDelivery = await sendConsultancyWhatsAppNotifications({
      user: freshUser,
      assignee: assignee.assignee,
      parentCoach,
      referenceNumber: transaction.referenceNumber,
      zoomJoinUrl: zoom?.join_url || null,
      totalAmount: transaction.totalAmount,
      documentUrl: invoiceUrl,
      fileName: `${transaction.referenceNumber || "Payment-Receipt"}.pdf`,
      healthConcernTitle,
      paidAt,
    });
  } catch (err) {
    console.error("[ConsultancyPayment] WhatsApp failed", err.message);
    whatsappDelivery = { error: err.message };
  }

  const updated = await updateConsultancyTransaction(withInvoice.id, {
    whatsappDelivery,
  });

  return toPublicTransactionWithInvoice(updated || withInvoice);
}

async function verifyConsultancyPayment(userId, {
  transactionId,
  orderId,
  paymentId: clientPaymentId,
  // Legacy aliases accepted for smoother client migration
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

  return finalizePaidConsultancyTransaction(transaction, {
    paymentId,
    provider: "cashfree",
  });
}

async function previewCheckout({ referralCode, userId } = {}) {
  const preview = await buildCheckoutPreview({ referralCode });
  if (!userId) {
    return preview;
  }
  const user = await getUserById(userId);
  if (!user) {
    return preview;
  }
  const eligibility = await resolveConsultancyPurchaseEligibility(user);
  return {
    ...preview,
    eligibility,
  };
}

module.exports = {
  previewCheckout,
  createConsultancyOrder,
  verifyConsultancyPayment,
  finalizePaidConsultancyTransaction,
  calculateConsultancyPricing,
  isReferralCodeValidForDiscount,
};
