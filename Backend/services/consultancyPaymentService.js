const { getAppConfig } = require("../models/appConfigModel");
const config = require("../config");
const { getUserById, updateUser } = require("../models/userModel");
const { getWellnessCoachRecordById } = require("../models/wellnessCoachModel");
const { convertSeekToHeal } = require("../models/userConversionModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const {
  buildCheckoutPreview,
  getActiveRazorpayGateway,
  isReferralCodeValidForDiscount,
  calculateConsultancyPricing,
} = require("../services/consultancyPricingService");
const { resolveMeetingAssignee } = require("../services/meetingAssigneeService");
const {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  createMockOrder,
  verifyMockPayment,
  shouldUseMockPayments,
} = require("../utils/paymentGateway");
const { createZoomMeeting } = require("../utils/zoom");
const { sendConsultancyWhatsAppNotifications } = require("../utils/whatsapp");
const { generateConsultancyInvoicePdf } = require("../utils/invoicePdf");
const { uploadBufferToS3, resolvePublicUrl } = require("../utils/s3");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  resolveHealthConcernForConsultancy,
} = require("./consultancyHealthConcern");

function mapPaymentError(err) {
  if (err?.name === "InvalidReferralCodeError") {
    const e = new Error(err.message);
    e.name = "InvalidReferralCodeError";
    throw e;
  }
  throw err;
}

async function createConsultancyOrder(userId, { referralCode, paymentMethod = "upi", healthConcernId } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const healthConcern = await resolveHealthConcernForConsultancy(healthConcernId);

  const preview = await buildCheckoutPreview({ referralCode });
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveRazorpayGateway(appConfig);
  const useMock = shouldUseMockPayments(gateway);

  let assigneePreview = null;
  try {
    assigneePreview = await resolveMeetingAssignee(
      preview.referralCodeValid ? preview.referralCode : null
    );
  } catch (err) {
    mapPaymentError(err);
  }

  const transaction = await createConsultancyTransaction({
    userId,
    paymentStatus: "pending",
    paymentProvider: useMock ? "mock" : "razorpay",
    paymentMethod,
    ...preview.pricing,
    referralCodeUsed: preview.referralCode,
    referralCodeValid: preview.referralCodeValid,
    meetingAssigneeType: assigneePreview?.assigneeType || null,
    meetingAssigneeId: assigneePreview?.assigneeId || null,
    parentCoachId: assigneePreview?.parentCoachId || null,
    visibleToCoachIds: assigneePreview?.visibleToCoachIds || [],
    userSnapshot: {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      phoneCountryCode: user.phoneCountryCode,
      whatsappSameAsMobile: user.whatsappSameAsMobile,
      whatsappPhone: user.whatsappPhone,
      whatsappCountryCode: user.whatsappCountryCode,
    },
    assigneeSnapshot: assigneePreview?.assignee || null,
    healthConcernId: healthConcern.healthConcernId,
    healthConcernSnapshot: healthConcern.healthConcernSnapshot,
  });

  try {
    await updateUser(userId, { primaryHealthConcern: healthConcern.healthConcernId });
  } catch (err) {
    console.error("[ConsultancyPayment] update user health concern failed", err.message);
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
      },
    });
  }

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
  });

  if (useMock && config.autoConfirmMockPayments) {
    const paidTransaction = await finalizePaidConsultancyTransaction(updated, {
      paymentId: `pay_mock_${Date.now()}`,
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

async function finalizePaidConsultancyTransaction(transaction, { paymentId, provider }) {
  const user = await getUserById(transaction.userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  let assignee;
  try {
    assignee = await resolveMeetingAssignee(transaction.referralCodeUsed);
  } catch (err) {
    assignee = {
      assigneeType: "admin",
      assigneeId: "admin",
      assignee: transaction.assigneeSnapshot || { type: "admin", name: "Admin" },
      parentCoachId: null,
      visibleToCoachIds: [],
    };
  }

  if (normalizeUserTier(user.userTier) !== "heal") {
    try {
      await convertSeekToHeal(user.id, {
        referralCode: transaction.referralCodeUsed || null,
      });
    } catch (err) {
      if (err?.name !== "AlreadyConvertedError") {
        console.error("[ConsultancyPayment] convertSeekToHeal failed", err.message);
      }
    }
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

  let whatsappDelivery = null;
  try {
    whatsappDelivery = await sendConsultancyWhatsAppNotifications({
      user: freshUser,
      assignee: assignee.assignee,
      parentCoach,
      referenceNumber: transaction.referenceNumber,
      zoomJoinUrl: zoom?.join_url || null,
      totalAmount: transaction.totalAmount,
    });
  } catch (err) {
    console.error("[ConsultancyPayment] WhatsApp failed", err.message);
    whatsappDelivery = { error: err.message };
  }

  const appConfig = await getAppConfig();
  let invoicePdfKey = null;
  try {
    const pdfBuffer = await generateConsultancyInvoicePdf({
      referenceNumber: transaction.referenceNumber,
      paidAt: new Date().toISOString(),
      user: freshUser,
      pricing: {
        baseAmount: transaction.baseAmount,
        discountAmount: transaction.discountAmount,
        taxAmount: transaction.taxAmount,
        taxPercent: transaction.taxPercent,
        taxType: transaction.taxType,
        totalAmount: transaction.totalAmount,
      },
      assignee: assignee.assignee,
      zoomJoinUrl: zoom?.join_url || null,
      appName: appConfig?.app_name || "Wellness",
    });
    invoicePdfKey = await uploadBufferToS3({
      buffer: pdfBuffer,
      contentType: "application/pdf",
      folder: "invoices",
      originalName: `${transaction.referenceNumber}.pdf`,
    });
  } catch (err) {
    console.error("[ConsultancyPayment] Invoice PDF failed", err.message);
  }

  const paidAt = new Date().toISOString();
  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentStatus: "paid",
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
    invoicePdfKey,
    whatsappDelivery,
  });

  const pub = toPublicTransaction(updated);
  if (pub.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
  return pub;
}

async function verifyConsultancyPayment(userId, {
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
  if (transaction.paymentStatus === "paid") {
    const pub = toPublicTransaction(transaction);
    if (pub.invoicePdfKey) pub.invoiceUrl = resolvePublicUrl(pub.invoicePdfKey);
    return pub;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveRazorpayGateway(appConfig);
  const useMock = shouldUseMockPayments(gateway);

  let verified = false;
  let paymentId = razorpay_payment_id;

  if (useMock) {
    verified = verifyMockPayment({ orderId: razorpay_order_id || transaction.paymentGatewayOrderId });
    paymentId = paymentId || `pay_mock_${Date.now()}`;
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
    await updateConsultancyTransaction(transaction.id, {
      paymentStatus: "failed",
      failureReason: "Payment verification failed",
    });
    const err = new Error("Payment verification failed");
    err.name = "PaymentVerificationError";
    throw err;
  }

  return finalizePaidConsultancyTransaction(transaction, {
    paymentId,
    provider: useMock ? "mock" : "razorpay",
  });
}

async function previewCheckout({ referralCode } = {}) {
  return buildCheckoutPreview({ referralCode });
}

module.exports = {
  previewCheckout,
  createConsultancyOrder,
  verifyConsultancyPayment,
  finalizePaidConsultancyTransaction,
  calculateConsultancyPricing,
  isReferralCodeValidForDiscount,
};
