const { getUserById, updateUser } = require("../models/userModel");
const { isConsultancyOnlyTier } = require("../models/userAssignmentLogic");
const { ensureHealIfProgramPurchased, convertSeekToHeal } = require("../models/userConversionModel");
const { getActiveCashfreeGateway } = require("./consultancyPricingService");
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
  createUserProgram,
  getPurchasableProgramForUser,
  getActiveProgramForUser,
  updateUserProgram,
  getUserProgramById,
  normalizeCoachType,
} = require("../models/userProgramModel");
const {
  createCashfreeOrder,
  verifyCashfreePayment,
  buildClientPaymentPayload,
} = require("../utils/paymentGateway");
const { ensureCashfreeCheckoutOrder } = require("./paymentOrderHelpers");
const { getAppConfig } = require("../models/appConfigModel");
const { emitPaymentReceived } = require("./adminActivityService");
const { notifyProgramPaymentConfirmedAsync } = require("./whatsappJourneyService");
const {
  toPublicTransactionWithInvoice,
} = require("../utils/consultancyInvoiceResponse");
const {
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  isPendingCheckoutOrderReusable,
  toPublicCoachProgramOffer,
} = require("./coachCheckoutService");
const { applyPaidSubscriptionOutcome } = require("./subscriptionPaymentService");
const { resolveSubscriptionPlanForPayment } = require("./subscriptionCategoryService");
const { grantBundledFyAppSubscription } = require("./energyExchangeEntitlementService");
const {
  buildEaglePaidOnboardingCompleteUpdates,
} = require("../utils/paidOnboardingHelpers");

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
  // Assigned / offered programs can be bought without consultancy (Eagle Seek flow).
  // Seek with no offer and no purchasable assignment still cannot buy.
  if (!offer && !isConsultancyOnlyTier(user.userTier)) {
    const assigned = await getPurchasableProgramForUser(userId);
    if (!assigned) {
      const err = new Error("Complete consultancy payment before purchasing a Wellness Program");
      err.name = "ConsultancyRequiredError";
      throw err;
    }
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
      const gateway = getActiveCashfreeGateway(appConfig);
      const ensured = await ensureCashfreeCheckoutOrder({
        transaction: existingPending,
        user,
        gateway,
        amountInRupees: existingPending.totalAmount,
        notes: {
          productType: "program",
          programId: existingPending.userSnapshot?.programId || offer?.itemId || "",
        },
      });
      const publicOffer = offer ? toPublicCoachProgramOffer(offer) : null;

      return {
        transaction: toPublicTransaction(ensured.transaction),
        pricing: preview.pricing,
        program: {
          id: existingPending.userSnapshot?.programId || offer?.itemId || null,
          title:
            existingPending.userSnapshot?.programTitle ||
            existingPending.userSnapshot?.catalogItemName ||
            offer?.itemName ||
            "",
          price: existingPending.totalAmount,
          listPrice: existingPending.baseAmount,
          source: publicOffer ? "coach_checkout" : "assigned_program",
        },
        offer: publicOffer,
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
  const gateway = getActiveCashfreeGateway(appConfig);

  const pricingFields = {
    baseAmount: preview.pricing.baseAmount,
    discountAmount: preview.pricing.discountAmount,
    discountedBase: preview.pricing.discountedBase,
    taxAmount: preview.pricing.taxAmount,
    taxPercent: preview.pricing.taxPercent,
    taxType: preview.pricing.taxType,
    totalAmount: preview.pricing.totalAmount,
    currency: preview.pricing.currency,
    paymentProvider: "cashfree",
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
      bundledSubscription: offer?.bundledSubscription || existingPending?.userSnapshot?.bundledSubscription || null,
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
      productType: "program",
      programId: program.id,
    },
  });

  const updated = await updateConsultancyTransaction(transaction.id, {
    paymentGatewayOrderId: order.id,
    paymentGatewaySessionId: order.payment_session_id || null,
  });

  return {
    transaction: toPublicTransaction(updated),
    pricing: preview.pricing,
    program: preview.program,
    offer: preview.offer || null,
    payment: buildClientPaymentPayload({ gateway, order }),
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

async function ensureUserProgramFromTransaction(user, transaction, paidAt) {
  const existing = await findUserProgramForTransaction(user, transaction);
  if (existing) return existing;

  const snap = transaction?.userSnapshot || {};
  const catalogItemId = String(snap.catalogItemId || "").trim();
  const title = String(snap.catalogItemName || "").trim();
  if (!catalogItemId && !title) return null;

  const coachId = String(
    transaction?.parentCoachId || transaction?.meetingAssigneeId || user?.parentCoachId || "",
  ).trim();
  if (!coachId) return null;

  const programType = await resolvePurchasedProgramType(user, transaction);
  const coachType = normalizeCoachType(
    transaction?.meetingAssigneeType,
    transaction?.meetingAssigneeType === "assistant_wellness_coach"
      ? "assistant_wellness_coach"
      : "wellness_coach",
  );

  return createUserProgram({
    userId: user.id,
    coachId,
    coachType,
    catalogProgramId: catalogItemId || title.toLowerCase().replace(/\s+/g, "-"),
    title: title || "Wellness Program",
    programType,
    description: "",
    price: Number(snap.catalogAmount) || Number(transaction?.totalAmount) || 0,
    currency: String(transaction?.currency || "INR").toUpperCase(),
    enabled: true,
    status: "purchased",
    purchasedAt: paidAt,
    transactionId: transaction?.id || null,
  });
}

async function backfillPurchasedProgramRecord(user) {
  if (!user?.programPurchased || user?.assignedProgramId) return null;

  const result = await listTransactionsByUserId(user.id, {
    page: 1,
    limit: 20,
    paymentStatus: "paid",
    productType: "program",
  });
  const transaction =
    (result.items || []).find((row) => String(row.paymentStatus || "").toLowerCase() === "paid") ||
    null;
  if (!transaction) return null;

  const paidAt = transaction.paidAt || transaction.updatedAt || new Date().toISOString();
  const userProgram = await ensureUserProgramFromTransaction(user, transaction, paidAt);
  if (!userProgram) return null;

  await updateUser(user.id, {
    assignedProgramId: userProgram.id,
    programEnabled: true,
  });

  return userProgram;
}

async function resolvePurchasedProgramType(user, transaction) {
  const snapshotType = String(
    transaction?.userSnapshot?.catalogProgramType || ""
  )
    .trim()
    .toLowerCase();
  if (snapshotType === "eagle" || snapshotType === "goal_based" || snapshotType === "lifetime") {
    return snapshotType;
  }

  const catalogItemId = String(transaction?.userSnapshot?.catalogItemId || "").trim();
  if (catalogItemId) {
    const appConfig = await getAppConfig();
    const rows = Array.isArray(appConfig?.app_program_pricing)
      ? appConfig.app_program_pricing
      : [];
    const match = rows.find((row) => String(row?.id || "") === catalogItemId);
    const type = String(match?.programType || "").trim().toLowerCase();
    if (type === "eagle" || type === "goal_based" || type === "lifetime") return type;
  }

  const userProgram =
    (await findUserProgramForTransaction(user, transaction)) ||
    (await getPurchasableProgramForUser(user.id)) ||
    (await getActiveProgramForUser(user.id)) ||
    null;
  const programType = String(userProgram?.programType || "").trim().toLowerCase();
  if (programType === "eagle" || programType === "goal_based" || programType === "lifetime") {
    return programType;
  }
  return "goal_based";
}

async function applyPaidProgramEntitlements(user, transaction, paidAt) {
  let userProgram = await findUserProgramForTransaction(user, transaction);
  if (!userProgram) {
    userProgram = await ensureUserProgramFromTransaction(user, transaction, paidAt);
  }
  if (userProgram) {
    await updateUserProgram(userProgram.id, {
      status: "purchased",
      purchasedAt: userProgram.purchasedAt || paidAt,
      transactionId: transaction.id,
      enabled: true,
    });
  }

  const programType = await resolvePurchasedProgramType(user, transaction);
  const isEagle = programType === "eagle";

  await updateUser(user.id, {
    programPurchased: true,
    programPurchasedAt: user.programPurchasedAt || paidAt,
    assignedProgramId: userProgram?.id || user.assignedProgramId || null,
    pendingCoachCheckout: {},
    ...(isEagle
      ? {
          clientCategory: "eagle",
          ...buildEaglePaidOnboardingCompleteUpdates(),
        }
      : {}),
  });

  const refreshed = await getUserById(user.id);
  if (isEagle) {
    try {
      // Eagle buyers are typically Seek — no consultancy step.
      await convertSeekToHeal(refreshed.id, { allowFromSeek: true });
    } catch (err) {
      if (err?.name !== "AlreadyConvertedError") {
        console.error("[ProgramPayment] eagle convertSeekToHeal failed", err.message);
        throw err;
      }
    }
    // Re-apply eagle onboarding skip after any heal conversion side effects.
    await updateUser(refreshed.id, {
      clientCategory: "eagle",
      ...buildEaglePaidOnboardingCompleteUpdates(),
    });
  } else {
    await ensureHealIfProgramPurchased({
      ...refreshed,
      programPurchased: true,
    });
  }

  try {
    const {
      clearTemporaryChallengeFlagOnRealPurchase,
    } = require("./challengeAccessService");
    await clearTemporaryChallengeFlagOnRealPurchase(user.id);
  } catch (err) {
    console.error("[ProgramPayment] clear challenge temp flag failed", err.message);
  }

  const bundled = transaction?.userSnapshot?.bundledSubscription;
  if (bundled?.enabled && !isEagle) {
    const isFyBundle =
      bundled.kind === "fy_energy_exchange" ||
      bundled.itemId === "fy-current" ||
      (!bundled.days && Array.isArray(bundled.fyOffsets));

    if (isFyBundle || bundled.itemId || bundled.itemName) {
      const latest = await getUserById(user.id);
      if (isFyBundle || bundled.kind === "fy_energy_exchange" || bundled.itemId === "fy-current") {
        await grantBundledFyAppSubscription(latest || refreshed, transaction, bundled);
      } else {
        const plan = await resolveSubscriptionPlanForPayment({
          catalogItemId: bundled.itemId || null,
          catalogItemName: bundled.itemName || "",
        });
        await applyPaidSubscriptionOutcome(latest || refreshed, plan);
        if (plan.clientCategory === "eagle") {
          await updateUser(user.id, { clientCategory: "eagle" });
        }
      }
    }
  }
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
    notifyProgramPaymentConfirmedAsync({
      user,
      totalAmount: transaction.totalAmount,
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
  if (String(transaction.productType || "").toLowerCase() !== "program") {
    const err = new Error("Not a program transaction");
    err.name = "ValidationError";
    throw err;
  }
  if (transaction.paymentStatus === "paid") {
    return finalizePaidProgramTransaction(transaction, {
      paymentId: clientPaymentId || razorpay_payment_id || transaction.paymentGatewayPaymentId,
      provider: transaction.paymentProvider,
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
    provider: "cashfree",
  });
}

module.exports = {
  previewProgramCheckout,
  createProgramOrder,
  verifyProgramPayment,
  finalizePaidProgramTransaction,
  programPurchaseNeedsFinalization,
  userProgramLookupIds,
  backfillPurchasedProgramRecord,
};
