const AppError = require("../utils/AppError");
const { getAppConfig } = require("../models/appConfigModel");
const { getUserById, updateUser } = require("../models/userModel");
const { getReferralCodeRecord } = require("../models/referralCodeModel");
const { isStaffReferralEntityType, normalizeReferralCode } = require("../utils/referralCode");
const { listWellnessCoaches } = require("../models/wellnessCoachModel");
const { listAssistantWellnessCoaches } = require("../models/assistantWellnessCoachModel");
const { listAccounts } = require("../models/accountModel");
const { listHealConsultancyTracksByParentCoachId } = require("../models/userHealConsultancyTrackModel");
const {
  listAllTransactions,
  listTransactionsByUserId,
  createConsultancyTransaction,
  updateConsultancyTransaction,
  toPublicTransaction,
} = require("../models/consultancyTransactionModel");
const {
  roundMoney,
  parseMoney,
  getActiveRazorpayGateway,
} = require("./consultancyPricingService");
const {
  createRazorpayOrder,
  createMockOrder,
  shouldUseMockPayments,
} = require("../utils/paymentGateway");
const { isConsultancyOnlyTier, isHealTier } = require("../models/userAssignmentLogic");

const HOURS_BY_UNIT = {
  hour: 1,
  hours: 1,
  hr: 1,
  hrs: 1,
  day: 24,
  days: 24,
  week: 24 * 7,
  weeks: 24 * 7,
  month: 24 * 30,
  months: 24 * 30,
  year: 24 * 365,
  years: 24 * 365,
};

function parseDurationToHours(label) {
  const text = String(label || "").trim().toLowerCase();
  if (!text || text.includes("no expiry")) return null;
  const match = text.match(
    /^(\d+(?:\.\d+)?)\s*(hour|hours|hr|hrs|day|days|week|weeks|month|months|year|years)$/
  );
  if (match) {
    return Math.max(1, Math.round(Number(match[1]) * HOURS_BY_UNIT[match[2]]));
  }
  const hours = Number(text);
  if (Number.isInteger(hours) && hours > 0) return hours;
  throw new AppError("Choose a valid link validity period", 400);
}

function formatPhone(user) {
  const digits = String(user?.phone || "").trim();
  if (!digits) return "";
  const cc = String(user?.phoneCountryCode || "").trim();
  return cc ? `${cc} ${digits}` : digits;
}

function initialsFromName(name) {
  return String(name || "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";
}

function formatAgo(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function calculateOfferPricing(config, { baseAmount, discountPercent = 0 }) {
  const base = roundMoney(parseMoney(baseAmount));
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = roundMoney((base * pct) / 100);
  const discountedBase = roundMoney(Math.max(0, base - discountAmount));
  const taxPercent = parseMoney(config?.tax_value);
  const taxType = String(config?.tax_type || "exclusive").toLowerCase();

  let taxAmount;
  let totalAmount;
  if (taxType === "inclusive") {
    totalAmount = discountedBase;
    taxAmount = taxPercent > 0 ? roundMoney(totalAmount - totalAmount / (1 + taxPercent / 100)) : 0;
  } else {
    taxAmount = roundMoney(discountedBase * (taxPercent / 100));
    totalAmount = roundMoney(discountedBase + taxAmount);
  }

  return {
    baseAmount: base,
    discountAmount,
    discountedBase,
    taxAmount,
    taxPercent,
    taxType,
    totalAmount,
    currency: "INR",
    discountPercent: pct,
  };
}

function toPublicClient(user) {
  return {
    id: user.id,
    name: user.name || "",
    email: user.email || "",
    mobile: formatPhone(user),
    referralCode: user.referralCode || "",
    parentCoachId: user.parentCoachId || null,
    assignedCoachId: user.assignedCoachId || null,
    assignedCoachType: user.assignedCoachType || null,
    userTier: user.userTier || "",
  };
}

function isCheckoutOfferExpired(offer, now = Date.now()) {
  if (!offer?.expiresAt) return false;
  return new Date(offer.expiresAt).getTime() < now;
}

function getActiveCoachCheckoutOffer(user, productType, now = Date.now()) {
  const offer = user?.pendingCoachCheckout;
  if (!offer || typeof offer !== "object" || !offer.productType) return null;
  if (productType && String(offer.productType || "") !== String(productType)) return null;
  if (isCheckoutOfferExpired(offer, now)) return null;
  return offer;
}

function getExpiredCoachCheckoutOffer(user, productType, now = Date.now()) {
  const offer = user?.pendingCoachCheckout;
  if (!offer || typeof offer !== "object" || !offer.productType) return null;
  if (productType && String(offer.productType || "") !== String(productType)) return null;
  if (!isCheckoutOfferExpired(offer, now)) return null;
  return offer;
}

function toPublicCoachProgramOffer(offer) {
  if (!offer || typeof offer !== "object") return null;
  return {
    source: "coach_checkout",
    productType: offer.productType || "program",
    itemId: offer.itemId || null,
    itemName: offer.itemName || "",
    amount: Number(offer.amount) || 0,
    discountPercent: Number(offer.discountPercent) || 0,
    discountLabel: String(offer.discountLabel || "").trim(),
    netPayable: Number(offer.netPayable) || 0,
    linkValidity: offer.linkValidity || "",
    expiresAt: offer.expiresAt || null,
    appHealValidity: offer.appHealValidity || null,
    transactionId: offer.transactionId || null,
    payable: true,
  };
}

function canActorTriggerCheckout(actor, user) {
  if (!actor || !user) return false;
  const role = String(actor.role || "");
  if (role === "admin") return true;
  if (role === "wellness_coach") {
    return String(user.parentCoachId || "") === String(actor.id);
  }
  if (role === "assistant_wellness_coach") {
    return (
      String(user.assignedCoachId || "") === String(actor.id) &&
      String(user.assignedCoachType || "").toLowerCase() === "assistant_wellness_coach" &&
      Boolean(actor.parentCoachId) &&
      String(user.parentCoachId || "") === String(actor.parentCoachId)
    );
  }
  return false;
}

function deriveCheckoutCoachIds({ actor, user, wellnessCoachId, assistantCoachId } = {}) {
  const explicitParent = String(wellnessCoachId || "").trim();
  const actorParent = actor?.role === "wellness_coach" ? String(actor.id || "").trim() : "";
  const userParent = String(user?.parentCoachId || "").trim();
  const parentCoachId = explicitParent || actorParent || userParent || null;

  const explicitAssistant = String(assistantCoachId || "").trim();
  const assignedAssistant =
    String(user?.assignedCoachType || "").toLowerCase() === "assistant_wellness_coach"
      ? String(user?.assignedCoachId || "").trim()
      : "";
  const assistantId = explicitAssistant || assignedAssistant || null;

  return {
    parentCoachId,
    assistantCoachId: assistantId,
    meetingAssigneeId: assistantId || parentCoachId || null,
    meetingAssigneeType: assistantId
      ? "assistant_wellness_coach"
      : parentCoachId
        ? "wellness_coach"
        : null,
  };
}

function isPendingCheckoutOrderReusable(transaction, now = Date.now()) {
  if (!transaction) return false;
  if (String(transaction.paymentStatus || "").toLowerCase() !== "pending") return false;
  if (!transaction.paymentGatewayOrderId) return false;
  if (!transaction.linkExpiresAt) return true;
  return new Date(transaction.linkExpiresAt).getTime() > now;
}

function buildUserProgramGetPayload({ user, assignedProgram, offer } = {}) {
  const publicOffer = offer ? toPublicCoachProgramOffer(offer) : null;
  if (publicOffer) {
    return {
      message: "Wellness Program offer fetched",
      enabled: true,
      payable: true,
      program: {
        id: publicOffer.itemId,
        title: publicOffer.itemName,
        price: publicOffer.amount,
        currency: "INR",
        source: "coach_checkout",
        discountPercent: publicOffer.discountPercent,
        netPayable: publicOffer.netPayable,
        expiresAt: publicOffer.expiresAt,
        transactionId: publicOffer.transactionId,
      },
      offer: publicOffer,
      programPurchased: Boolean(user?.programPurchased),
      programPurchasedAt: user?.programPurchasedAt || null,
    };
  }

  if (!assignedProgram) {
    return {
      message: "No Wellness Program assigned",
      enabled: false,
      payable: false,
      program: null,
      offer: null,
      programPurchased: Boolean(user?.programPurchased),
      programPurchasedAt: user?.programPurchasedAt || null,
    };
  }

  return {
    message: "Wellness Program fetched",
    enabled: Boolean(assignedProgram.enabled) && !user?.programPurchased,
    payable: Boolean(assignedProgram.enabled) && !user?.programPurchased,
    program: assignedProgram,
    offer: null,
    programPurchased: Boolean(user?.programPurchased),
    programPurchasedAt: user?.programPurchasedAt || null,
  };
}

async function lookupClientByReferralCode(rawCode) {
  const code = normalizeReferralCode(rawCode);
  if (!code) throw new AppError("Referral code is required", 400);

  const record = await getReferralCodeRecord(code);
  if (!record) throw new AppError("No client found for that code", 404);
  if (isStaffReferralEntityType(record.entityType) || record.entityType !== "user") {
    throw new AppError("That code belongs to a coach. Enter the client's referral code.", 400);
  }

  const user = await getUserById(record.entityId);
  if (!user || user.status === "deleted") {
    throw new AppError("No client found for that code", 404);
  }
  return toPublicClient(user);
}

function mergeStaff(primary = [], fallback = [], parentKey) {
  const byId = new Map();
  for (const row of [...fallback, ...primary]) {
    const id = String(row.id || "").trim();
    if (!id) continue;
    byId.set(id, {
      id,
      name: row.name || "",
      referralCode: row.referralCode || "",
      ...(parentKey ? { wellnessCoachId: row[parentKey] || row.parentAccountId || "" } : {}),
    });
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

async function listCheckoutStaff() {
  const [coachesData, assistantsData, accountCoaches, accountAssistants] = await Promise.all([
    listWellnessCoaches({ page: 1, limit: 100, status: "active" }),
    listAssistantWellnessCoaches({ page: 1, limit: 200, status: "active" }),
    listAccounts({ page: 1, limit: 100, status: "active", roleKey: "wellness_coach" }),
    listAccounts({ page: 1, limit: 200, status: "active", roleKey: "assistant_wellness_coach" }),
  ]);

  return {
    coaches: mergeStaff(coachesData.wellnessCoaches, accountCoaches.accounts),
    assistants: mergeStaff(
      assistantsData.assistants,
      accountAssistants.accounts,
      "wellnessCoachId"
    ),
  };
}

function coachNameById(staff, coachId) {
  return staff.coaches.find((row) => String(row.id) === String(coachId))?.name || "";
}

async function listRecentPwc({ coachId, hours = 24 } = {}) {
  const since = new Date(Date.now() - Number(hours) * 60 * 60 * 1000).toISOString();
  const staff = await listCheckoutStaff();
  const coachIds = coachId
    ? [String(coachId)]
    : staff.coaches.map((row) => row.id).filter(Boolean);

  const [txnData, trackGroups] = await Promise.all([
    listAllTransactions({
      page: 1,
      limit: 200,
      paymentStatus: "paid",
      productType: "consultancy",
      coachId: coachId || undefined,
      fromDate: since,
    }),
    Promise.all(
      coachIds.slice(0, 40).map((id) =>
        listHealConsultancyTracksByParentCoachId(id, {
          page: 1,
          limit: 50,
          status: "completed",
          since,
        })
      )
    ),
  ]);

  const rows = new Map();

  for (const txn of txnData.transactions || []) {
    const completedAt = txn.updatedAt || txn.paidAt || txn.createdAt;
    if (String(completedAt) < since) continue;
    const status = String(txn.consultancyStatus || "").toLowerCase();
    if (status && status !== "completed") continue;
    const userId = String(txn.userId || "");
    if (!userId) continue;
    const name = txn.userSnapshot?.name || "Client";
    const consult =
      txn.healthConcernSnapshot?.title ||
      txn.userSnapshot?.healthConcernTitle ||
      "Programme-wise consult";
    rows.set(userId, {
      id: txn.id,
      userId,
      name,
      initials: initialsFromName(name),
      consult,
      code: "",
      coach: coachNameById(staff, txn.parentCoachId || txn.meetingAssigneeId),
      coachId: txn.parentCoachId || txn.meetingAssigneeId || "",
      ago: formatAgo(completedAt),
      completedAt,
    });
  }

  for (const group of trackGroups) {
    for (const track of group.items || []) {
      const completedAt = track.updatedAt || track.createdAt;
      if (String(completedAt) < since) continue;
      const userId = String(track.userId || "");
      if (!userId) continue;
      const existing = rows.get(userId);
      if (existing && String(existing.completedAt) >= String(completedAt)) continue;
      rows.set(userId, {
        id: track.id,
        userId,
        name: existing?.name || "Client",
        initials: existing?.initials || "?",
        consult: track.concern || existing?.consult || "Programme-wise consult",
        code: existing?.code || "",
        coach: coachNameById(staff, track.parentCoachId || track.assignedCoachId),
        coachId: track.parentCoachId || track.assignedCoachId || "",
        ago: formatAgo(completedAt),
        completedAt,
      });
    }
  }

  const items = [...rows.values()].sort((a, b) =>
    String(b.completedAt).localeCompare(String(a.completedAt))
  );

  const users = await Promise.all(
    items.map(async (row) => {
      try {
        const user = await getUserById(row.userId);
        if (!user) return row;
        return {
          ...row,
          name: user.name || row.name,
          initials: initialsFromName(user.name || row.name),
          code: user.referralCode || row.code,
          coach: row.coach || coachNameById(staff, user.parentCoachId),
          coachId: row.coachId || user.parentCoachId || "",
        };
      } catch {
        return row;
      }
    })
  );

  return users.filter((row) => row.code).slice(0, 20);
}

async function findCatalogItem(productType, itemId) {
  const config = await getAppConfig();
  if (!config) throw new AppError("App configuration not found", 404);
  const rows =
    productType === "subscription"
      ? config.app_subscription_pricing
      : config.app_program_pricing;
  const item = (Array.isArray(rows) ? rows : []).find((row) => String(row.id) === String(itemId));
  if (!item) {
    throw new AppError(
      productType === "subscription" ? "Subscription not found" : "Program not found",
      404
    );
  }
  return { config, item };
}

async function replacePendingTransaction(userId, productType) {
  const pending = await listTransactionsByUserId(userId, {
    page: 1,
    limit: 20,
    paymentStatus: "pending",
    productType,
  });
  return pending.items.find((row) => row.checkoutOffer) || pending.items[0] || null;
}

async function triggerCoachCheckout({
  userId,
  productType,
  itemId,
  discountPercent,
  discountLabel,
  linkValidity,
  appHealValidity,
  wellnessCoachId,
  assistantCoachId,
  actor,
}) {
  const type = String(productType || "").toLowerCase() === "subscription" ? "subscription" : "program";
  const user = await getUserById(userId);
  if (!user || user.status === "deleted") throw new AppError("Client not found", 404);
  if (actor && !canActorTriggerCheckout(actor, user)) {
    throw new AppError("User is not under your coaching hierarchy", 403);
  }

  if (type === "program" && user.programPurchased) {
    throw new AppError("Client has already purchased a Wellness Program", 409);
  }
  if (type === "subscription") {
    if (isHealTier(user.userTier)) {
      throw new AppError("Subscription is already active for this account", 409);
    }
    if (!isConsultancyOnlyTier(user.userTier)) {
      throw new AppError("Complete consultancy payment before triggering a subscription", 400);
    }
  }

  const { config, item } = await findCatalogItem(type, itemId);
  const configuredSlabs =
    type === "subscription"
      ? config.app_subscription_discount_slabs
      : config.app_program_discount_slabs;
  const slabs = Array.isArray(configuredSlabs)
    ? configuredSlabs
    : Array.isArray(config.coach_discount_slabs)
      ? config.coach_discount_slabs
      : [];
  const pct = Number(discountPercent);
  if (!slabs.some((slab) => Number(slab.pct) === pct)) {
    throw new AppError("Choose a discount slab from the published list", 400);
  }
  const configuredPeriods =
    type === "subscription"
      ? config.app_subscription_validity_periods
      : config.app_program_validity_periods;
  const periods = Array.isArray(configuredPeriods)
    ? configuredPeriods
    : Array.isArray(config.coach_validity_periods)
      ? config.coach_validity_periods
      : [];
  if (!periods.includes(String(linkValidity || "").trim())) {
    throw new AppError("Choose a validity period from the published list", 400);
  }
  if (type === "program") {
    const healPeriods = Array.isArray(config.app_heal_validity_periods)
      ? config.app_heal_validity_periods
      : [];
    if (appHealValidity && !healPeriods.includes(String(appHealValidity).trim())) {
      throw new AppError("Choose an App Heal period from the published list", 400);
    }
  }

  const validityHours = parseDurationToHours(linkValidity);
  const expiresAt = validityHours
    ? new Date(Date.now() + validityHours * 60 * 60 * 1000).toISOString()
    : null;
  const pricing = calculateOfferPricing(config, {
    baseAmount: item.amount,
    discountPercent: pct,
  });
  if (pricing.totalAmount <= 0) throw new AppError("Invalid payable amount", 400);

  const {
    parentCoachId,
    assistantCoachId: resolvedAssistantId,
    meetingAssigneeId,
    meetingAssigneeType,
  } = deriveCheckoutCoachIds({
    actor,
    user,
    wellnessCoachId,
    assistantCoachId,
  });

  const existing = await replacePendingTransaction(user.id, type);
  const snapshot = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    phoneCountryCode: user.phoneCountryCode,
    userTier: user.userTier,
    catalogItemId: item.id,
    catalogItemName: item.name,
    appHealValidity: type === "program" ? appHealValidity || null : null,
    linkValidity,
  };

  let transaction = existing;
  if (existing) {
    transaction = await updateConsultancyTransaction(existing.id, {
      baseAmount: pricing.baseAmount,
      discountAmount: pricing.discountAmount,
      discountedBase: pricing.discountedBase,
      taxAmount: pricing.taxAmount,
      taxPercent: pricing.taxPercent,
      taxType: pricing.taxType,
      totalAmount: pricing.totalAmount,
      currency: pricing.currency,
      parentCoachId,
      meetingAssigneeId,
      meetingAssigneeType,
      checkoutOffer: true,
      linkExpiresAt: expiresAt,
      userSnapshot: snapshot,
    });
  } else {
    transaction = await createConsultancyTransaction({
      userId: user.id,
      productType: type,
      paymentStatus: "pending",
      ...pricing,
      parentCoachId,
      meetingAssigneeId,
      meetingAssigneeType,
      checkoutOffer: true,
      linkExpiresAt: expiresAt,
      userSnapshot: snapshot,
    });
  }

  const gateway = getActiveRazorpayGateway(config);
  const useMock = shouldUseMockPayments(gateway);
  const order = useMock
    ? createMockOrder({
        amountInRupees: pricing.totalAmount,
        receipt: transaction.referenceNumber,
      })
    : await createRazorpayOrder({
        gateway,
        amountInRupees: pricing.totalAmount,
        receipt: transaction.referenceNumber,
        notes: {
          transactionId: transaction.id,
          userId: user.id,
          productType: type,
          catalogItemId: item.id,
        },
      });

  transaction = await updateConsultancyTransaction(transaction.id, {
    paymentProvider: useMock ? "mock" : "razorpay",
    paymentGatewayOrderId: order.id,
  });

  const offer = {
    productType: type,
    itemId: item.id,
    itemName: item.name,
    amount: item.amount,
    discountPercent: pct,
    discountLabel: String(discountLabel || "").trim(),
    netPayable: pricing.totalAmount,
    linkValidity,
    expiresAt,
    appHealValidity: type === "program" ? appHealValidity || null : null,
    wellnessCoachId: parentCoachId,
    assistantCoachId: resolvedAssistantId,
    transactionId: transaction.id,
    createdAt: new Date().toISOString(),
  };

  await updateUser(user.id, { pendingCoachCheckout: offer });

  return {
    client: toPublicClient(user),
    offer,
    pricing,
    transaction: toPublicTransaction(transaction),
  };
}

module.exports = {
  parseDurationToHours,
  calculateOfferPricing,
  isCheckoutOfferExpired,
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  toPublicCoachProgramOffer,
  canActorTriggerCheckout,
  deriveCheckoutCoachIds,
  isPendingCheckoutOrderReusable,
  buildUserProgramGetPayload,
  lookupClientByReferralCode,
  listCheckoutStaff,
  listRecentPwc,
  triggerCoachCheckout,
};
