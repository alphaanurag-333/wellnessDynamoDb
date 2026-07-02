const config = require("../config");
const { getUserById, updateUser } = require("../models/userModel");
const { isConsultancyOnlyTier } = require("../models/userAssignmentLogic");
const { getActiveRazorpayGateway } = require("./consultancyPricingService");
const { previewProgramCheckout } = require("./programPricingService");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  getPurchasableProgramForUser,
  updateUserProgram,
  getUserProgramById,
} = require("../models/userProgramModel");
const {
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  createMockOrder,
  verifyMockPayment,
  shouldUseMockPayments,
} = require("../utils/paymentGateway");
const { getAppConfig } = require("../models/appConfigModel");

function logPaymentFailure({ transactionId, userId, reason }) {
  console.error("[ProgramPayment] payment failed", {
    transactionId,
    userId,
    productType: "program",
    reason,
    timestamp: new Date().toISOString(),
  });
}

async function createProgramOrder(userId, { paymentMethod = "upi" } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (!isConsultancyOnlyTier(user.userTier)) {
    const err = new Error("Complete consultancy payment before purchasing a Wellness Program");
    err.name = "ConsultancyRequiredError";
    throw err;
  }

  if (user.programPurchased) {
    const err = new Error("Wellness Program already purchased");
    err.name = "AlreadyPurchasedError";
    throw err;
  }

  const preview = await previewProgramCheckout(userId);
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const program = await getPurchasableProgramForUser(userId);
  if (!program) {
    const err = new Error("No purchasable Wellness Program available");
    err.name = "NotFoundError";
    throw err;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveRazorpayGateway(appConfig);
  const useMock = shouldUseMockPayments(gateway);

  const transaction = await createConsultancyTransaction({
    userId,
    productType: "program",
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
      programId: program.id,
      programTitle: program.title,
      programType: program.programType,
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
        productType: "program",
        programId: program.id,
      },
    });
  }

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
  });

  if (useMock && config.autoConfirmMockPayments) {
    const paidTransaction = await finalizePaidProgramTransaction(updated, {
      paymentId: `pay_mock_program_${Date.now()}`,
      provider: "mock",
    });
    return {
      transaction: paidTransaction,
      pricing: preview.pricing,
      program: preview.program,
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
    program: preview.program,
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

async function finalizePaidProgramTransaction(transaction, { paymentId, provider }) {
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
      programPurchased: true,
    },
  });

  if (alreadyPaid) {
    return toPublicTransaction(paidRecord);
  }

  const programId =
    transaction.userSnapshot?.programId ||
    user.assignedProgramId ||
    (await getPurchasableProgramForUser(user.id))?.id;

  if (programId) {
    await updateUserProgram(programId, {
      status: "purchased",
      purchasedAt: paidAt,
      transactionId: transaction.id,
      enabled: true,
    });
  }

  await updateUser(user.id, {
    programPurchased: true,
    programPurchasedAt: paidAt,
    assignedProgramId: programId || user.assignedProgramId || null,
  });

  const fresh = await getConsultancyTransactionById(transaction.id);
  return toPublicTransaction(fresh);
}

async function verifyProgramPayment(userId, {
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
  if (String(transaction.productType || "").toLowerCase() !== "program") {
    const err = new Error("Not a program transaction");
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
    paymentId = paymentId || `pay_mock_program_${Date.now()}`;
  } else {
    if (!gateway) {
      const err = new Error("Payment gateway is not configured");
      err.name = "PaymentGatewayError";
      throw err;
    }
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      const err = new Error(
        "razorpay_order_id, razorpay_payment_id and razorpay_signature are required"
      );
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

  return finalizePaidProgramTransaction(transaction, {
    paymentId,
    provider: useMock ? "mock" : "razorpay",
  });
}

module.exports = {
  previewProgramCheckout,
  createProgramOrder,
  verifyProgramPayment,
  finalizePaidProgramTransaction,
};
