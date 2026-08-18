const config = require("../config");
const { getUserById, updateUser } = require("../models/userModel");
const { isConsultancyOnlyTier } = require("../models/userAssignmentLogic");
const { ensureHealIfProgramPurchased } = require("../models/userConversionModel");
const { getActiveRazorpayGateway } = require("./consultancyPricingService");
const { previewProgramCheckout } = require("./programPricingService");
const {
  createConsultancyTransaction,
  getConsultancyTransactionById,
  updateConsultancyTransaction,
  markTransactionPaidIfPending,
  listTransactionsByUserId,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  getPurchasableProgramForUser,
  getActiveProgramForUser,
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
const { emitPaymentReceived } = require("./adminActivityService");
const {
  toPublicTransactionWithInvoice,
} = require("../utils/consultancyInvoiceResponse");
const {
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  isPendingCheckoutOrderReusable,
  toPublicCoachProgramOffer,
} = require("./coachCheckoutService");

function logPaymentFailure({ transactionId, userId, reason }) {
  console.error("[ProgramPayment] payment failed", {
    transactionId,
    userId,
    productType: "program",
    reason,
    timestamp: new Date().toISOString(),
  });
}

async function getPendingProgramOrderForUser(userId) {
  const result = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 20,
    paymentStatus: "pending",
    productType: "program",
  });
  return result.items[0] || null;
}

async function createProgramOrder(userId, { paymentMethod = "upi" } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const expiredOffer = getExpiredCoachCheckoutOffer(user, "program");
  if (expiredOffer) {
    const err = new Error("This payment link has expired");
    err.name = "ValidationError";
    throw err;
  }

  const offer = getActiveCoachCheckoutOffer(user, "program");
  if (!offer && !isConsultancyOnlyTier(user.userTier)) {
    const err = new Error("Complete consultancy payment before purchasing a Wellness Program");
    err.name = "ConsultancyRequiredError";
    throw err;
  }

  if (user.programPurchased) {
    const err = new Error("Wellness Program already purchased");
    err.name = "AlreadyPurchasedError";
    throw err;
  }

  const existingPending = await getPendingProgramOrderForUser(userId);
  if (isPendingCheckoutOrderReusable(existingPending)) {
    const preview = await previewProgramCheckout(userId);
    if (Number(existingPending.totalAmount) === Number(preview.pricing.totalAmount)) {
      const appConfig = await getAppConfig();
      const gateway = getActiveRazorpayGateway(appConfig);
      const useMock = shouldUseMockPayments(gateway);
      const publicOffer = offer ? toPublicCoachProgramOffer(offer) : null;
      return {
        transaction: toPublicTransaction(existingPending),
        pricing: preview.pricing,
        program: {
          id: existingPending.userSnapshot?.programId || offer?.itemId || null,
          title: existingPending.userSnapshot?.programTitle || existingPending.userSnapshot?.catalogItemName || offer?.itemName || "",
          price: existingPending.totalAmount,
          listPrice: existingPending.baseAmount,
          source: publicOffer ? "coach_checkout" : "assigned_program",
        },
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

  const preview = await previewProgramCheckout(userId);
  if (preview.pricing.totalAmount <= 0) {
    const err = new Error("Invalid payable amount");
    err.name = "ValidationError";
    throw err;
  }

  const program = preview.source === "coach_checkout"
    ? preview.program
    : await getPurchasableProgramForUser(userId);
  if (!program) {
    const err = new Error("No purchasable Wellness Program available");
    err.name = "NotFoundError";
    throw err;
  }

  const appConfig = await getAppConfig();
  const gateway = getActiveRazorpayGateway(appConfig);
  const useMock = shouldUseMockPayments(gateway);

  const pricingFields = {
    baseAmount: preview.pricing.baseAmount,
    discountAmount: preview.pricing.discountAmount,
    discountedBase: preview.pricing.discountedBase,
    taxAmount: preview.pricing.taxAmount,
    taxPercent: preview.pricing.taxPercent,
    taxType: preview.pricing.taxType,
    totalAmount: preview.pricing.totalAmount,
    currency: preview.pricing.currency,
    paymentProvider: useMock ? "mock" : "razorpay",
    paymentMethod,
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
      programId: program.id,
      userProgramId: preview.source === "coach_checkout" ? null : program.id,
      programTitle: program.title,
      programType: program.programType,
      catalogItemId: offer?.itemId || preview.offer?.itemId || program.catalogProgramId || null,
      catalogItemName: offer?.itemName || preview.offer?.itemName || program.title || "",
    },
  };

  const transaction = existingPending
    ? await updateConsultancyTransaction(existingPending.id, pricingFields)
    : await createConsultancyTransaction({
        userId,
        productType: "program",
        paymentStatus: "pending",
        referralCodeUsed: null,
        referralCodeValid: false,
        ...pricingFields,
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
    program: preview.program,
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

function programPurchaseNeedsFinalization(user) {
  if (!user?.programPurchased) return true;
  const pending = user.pendingCoachCheckout;
  return Boolean(pending && typeof pending === "object" && pending.productType);
}

function userProgramLookupIds(user, transaction) {
  return [
    user?.assignedProgramId,
    transaction?.userSnapshot?.userProgramId,
    transaction?.userSnapshot?.programId,
  ].filter(Boolean);
}

async function findUserProgramForTransaction(user, transaction) {
  const seen = new Set();
  for (const id of userProgramLookupIds(user, transaction)) {
    if (seen.has(id)) continue;
    seen.add(id);
    const row = await getUserProgramById(id);
    if (row && String(row.userId) === String(user.id)) return row;
  }

  return (
    (await getPurchasableProgramForUser(user.id)) ||
    (await getActiveProgramForUser(user.id)) ||
    null
  );
}

async function applyPaidProgramEntitlements(user, transaction, paidAt) {
  const userProgram = await findUserProgramForTransaction(user, transaction);
  if (userProgram) {
    await updateUserProgram(userProgram.id, {
      status: "purchased",
      purchasedAt: userProgram.purchasedAt || paidAt,
      transactionId: transaction.id,
      enabled: true,
    });
  }

  await updateUser(user.id, {
    programPurchased: true,
    programPurchasedAt: user.programPurchasedAt || paidAt,
    assignedProgramId: userProgram?.id || user.assignedProgramId || null,
    pendingCoachCheckout: {},
  });

  const refreshed = await getUserById(user.id);
  await ensureHealIfProgramPurchased({
    ...refreshed,
    programPurchased: true,
  });
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

  if (!alreadyPaid) {
    emitPaymentReceived({
      user,
      amount: transaction.totalAmount,
      productLabel: "Program",
      transactionId: transaction.id,
    });
  }

  if (programPurchaseNeedsFinalization(user)) {
    await applyPaidProgramEntitlements(user, transaction, paidRecord?.paidAt || paidAt);
  }

  const fresh = await getConsultancyTransactionById(transaction.id);
  return toPublicTransactionWithInvoice(fresh || paidRecord);
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
    return finalizePaidProgramTransaction(transaction, {
      paymentId: razorpay_payment_id || transaction.paymentGatewayPaymentId,
      provider: transaction.paymentProvider,
    });
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
  programPurchaseNeedsFinalization,
  userProgramLookupIds,
};
