const AppError = require("../utils/AppError");
const { getAppConfig } = require("../models/appConfigModel");
const { getUserById, updateUser } = require("../models/userModel");
const { getReferralCodeRecord } = require("../models/referralCodeModel");
const {
  isStaffReferralCode,
  isStaffReferralEntityType,
  normalizeReferralCode,
} = require("../utils/referralCode");
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
const { isConsultancyOnlyTier, isHealTier, isMaintenanceTier } = require("../models/userAssignmentLogic");
const {
  resolveSubscriptionPlanFromItem,
} = require("./subscriptionCategoryService");

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
  const listed = roundMoney(parseMoney(baseAmount));
  const pct = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const taxPercent = parseMoney(config?.tax_value);
  const taxType = String(config?.tax_type || "exclusive").toLowerCase();

  const discountAmount = roundMoney(listed * (pct / 100));
  const discountedBase = roundMoney(Math.max(0, listed - discountAmount));

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
    baseAmount: listed,
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

function isEnabledFlag(value) {
  if (value === true || value === 1) return true;
  const normalized = String(value ?? "").trim().toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes";
}

function resolveBundledSubscription(config, {
  includeAppSubscription,
  fyYearCount,
  fyOffsets,
} = {}) {
  // Complimentary FY app subscription is always bundled with program checkout unless explicitly off.
  const enabled =
    includeAppSubscription === undefined
      ? true
      : isEnabledFlag(includeAppSubscription);
  if (!enabled) return null;

  const maxYears = 4;
  let offsets;
  if (Array.isArray(fyOffsets) && fyOffsets.length) {
    offsets = fyOffsets.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n >= 0);
  } else {
    const years = Math.min(maxYears, Math.max(1, Number(fyYearCount) || 1));
    offsets = Array.from({ length: years }, (_, i) => i);
  }
  if (!offsets.length) offsets = [0];

  const yearCount = offsets.length;
  const monthlyAmount = Number(config?.energy_exchange_monthly_amount) || 0;
  const itemName =
    yearCount === 1
      ? "Current financial year app subscription"
      : `${yearCount} financial year app subscription`;

  return {
    enabled: true,
    kind: "fy_energy_exchange",
    itemId: yearCount === 1 ? "fy-current" : `fy-${yearCount}y`,
    itemName,
    fyOffsets: offsets,
    monthlyAmount,
    includedInProgramPrice: true,
  };
}

function toPublicCoachProgramOffer(offer) {
  if (!offer || typeof offer !== "object") return null;
  const amount = Number(offer.amount) || 0;
  const netPayable =
    offer.netPayable == null || offer.netPayable === ""
      ? amount
      : Number(offer.netPayable) || 0;
  const bundled = offer.bundledSubscription?.enabled ? offer.bundledSubscription : null;
  return {
    source: "coach_checkout",
    productType: offer.productType || "program",
    itemId: offer.itemId || null,
    itemName: offer.itemName || "",
    programType: offer.catalogProgramType || offer.programType || null,
    amount,
    discountPercent: Number(offer.discountPercent) || 0,
    discountLabel: String(offer.discountLabel || "").trim(),
    netPayable,
    linkValidity: offer.linkValidity || "",
    expiresAt: offer.expiresAt || null,
    appHealValidity: offer.appHealValidity || null,
    catalogProgramType: offer.catalogProgramType || offer.programType || null,
    bundledSubscription: bundled
      ? {
          kind: bundled.kind || "fy_energy_exchange",
          itemId: bundled.itemId || null,
          itemName: bundled.itemName || "",
          fyOffsets: Array.isArray(bundled.fyOffsets) ? bundled.fyOffsets : [0],
          monthlyAmount: Number(bundled.monthlyAmount) || 0,
          includedInProgramPrice: true,
        }
      : null,
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

function buildUserProgramGetPayload({ user, assignedProgram, offer, pricing } = {}) {
  const publicOffer = offer ? toPublicCoachProgramOffer(offer) : null;
  const breakdown = pricing && typeof pricing === "object" ? pricing : null;
  if (publicOffer) {
    const netPayable =
      breakdown && breakdown.netPayable != null ? Number(breakdown.netPayable) : publicOffer.netPayable;
    return {
      message: "Wellness Program offer fetched",
      enabled: true,
      payable: true,
      program: {
        id: publicOffer.itemId,
        title: publicOffer.itemName,
        programType: publicOffer.programType || publicOffer.catalogProgramType || null,
        price: netPayable,
        listPrice: publicOffer.amount,
        currency: breakdown?.currency || "INR",
        source: "coach_checkout",
        discountPercent: publicOffer.discountPercent,
        netPayable,
        expiresAt: publicOffer.expiresAt,
        transactionId: publicOffer.transactionId,
      },
      offer: {
        ...publicOffer,
        netPayable,
      },
      pricing: breakdown,
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
      pricing: null,
      programPurchased: Boolean(user?.programPurchased),
      programPurchasedAt: user?.programPurchasedAt || null,
    };
  }

  return {
    message: "Wellness Program fetched",
    enabled: Boolean(assignedProgram.enabled) && !user?.programPurchased,
    payable: Boolean(assignedProgram.enabled) && !user?.programPurchased,
    program: breakdown
      ? {
          ...assignedProgram,
          price: breakdown.netPayable,
          listPrice: assignedProgram.price ?? assignedProgram.listPrice,
          currency: assignedProgram.currency || breakdown.currency,
        }
      : assignedProgram,
    offer: null,
    pricing: breakdown,
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

function findStaffReferralCode(staff, id) {
  if (!id) return "";
  const key = String(id);
  const coach = staff.coaches.find((row) => String(row.id) === key);
  if (coach?.referralCode) return normalizeReferralCode(coach.referralCode);
  const assistant = staff.assistants.find((row) => String(row.id) === key);
  return normalizeReferralCode(assistant?.referralCode);
}

function isKnownStaffReferralCode(code, staff) {
  const normalized = normalizeReferralCode(code);
  if (!normalized) return false;
  // Legacy IRW-WC-* / IRW-AWC-* codes, or any code currently on the staff roster.
  if (isStaffReferralCode(normalized)) return true;
  return Boolean(
    staff?.coaches?.some((row) => normalizeReferralCode(row.referralCode) === normalized) ||
      staff?.assistants?.some((row) => normalizeReferralCode(row.referralCode) === normalized)
  );
}

/** Prefer the WC/AWC code used to assign the client, not the client's own code. */
function resolvePwcStaffReferralCode(user = {}, staff, fallbackCoachId = "") {
  const referred = normalizeReferralCode(user.referredByCode);
  if (isKnownStaffReferralCode(referred, staff)) return referred;

  const assignedType = String(user.assignedCoachType || "").toLowerCase();
  if (assignedType === "assistant_wellness_coach") {
    const assistantCode = findStaffReferralCode(staff, user.assignedCoachId);
    if (assistantCode) return assistantCode;
  }

  return (
    findStaffReferralCode(staff, user.assignedCoachId) ||
    findStaffReferralCode(staff, user.parentCoachId || fallbackCoachId) ||
    ""
  );
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
        const staffCode = resolvePwcStaffReferralCode(user, staff, row.coachId);
        return {
          ...row,
          name: user.name || row.name,
          initials: initialsFromName(user.name || row.name),
          code: staffCode,
          clientCode: user.referralCode || "",
          client: toPublicClient(user),
          coach: row.coach || coachNameById(staff, user.parentCoachId || user.assignedCoachId),
          coachId: row.coachId || user.parentCoachId || user.assignedCoachId || "",
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
  includeAppSubscription,
  subscriptionItemId,
  fyYearCount,
  fyOffsets,
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

  const { config, item } = await findCatalogItem(type, itemId);

  if (type === "subscription") {
    const plan = resolveSubscriptionPlanFromItem(item);
    if (plan.kind === "maintenance") {
      if (!isHealTier(user.userTier) && !isMaintenanceTier(user.userTier)) {
        throw new AppError("Maintenance plan is available after the Heal course period ends", 400);
      }
    } else {
      if (isHealTier(user.userTier) || isMaintenanceTier(user.userTier)) {
        throw new AppError("Subscription is already active for this account", 409);
      }
      if (!isConsultancyOnlyTier(user.userTier)) {
        throw new AppError("Complete consultancy payment before triggering a subscription", 400);
      }
    }
  }
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

  const bundledSubscription =
    type === "program"
      ? resolveBundledSubscription(config, {
          includeAppSubscription,
          fyYearCount,
          fyOffsets,
        })
      : null;

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
    catalogAmount: item.amount,
    catalogProgramType: item.programType || null,
    discountPercent: pct,
    discountLabel: String(discountLabel || "").trim(),
    appHealValidity: type === "program" ? appHealValidity || null : null,
    bundledSubscription,
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
    programType: item.programType || null,
    catalogProgramType: item.programType || null,
    amount: item.amount,
    discountPercent: pct,
    discountLabel: String(discountLabel || "").trim(),
    netPayable: pricing.totalAmount,
    linkValidity,
    expiresAt,
    appHealValidity: type === "program" ? appHealValidity || null : null,
    bundledSubscription,
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

const CHECKOUT_HISTORY_TYPES = new Set(["program", "subscription"]);

function formatCheckoutHistoryDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function checkoutDiscountPercent(transaction) {
  const stored = Number(transaction?.userSnapshot?.discountPercent);
  if (Number.isFinite(stored) && stored >= 0) return stored;
  const base = Number(transaction?.baseAmount) || 0;
  const discount = Number(transaction?.discountAmount) || 0;
  if (base <= 0) return 0;
  return Math.round((discount / base) * 100);
}

function isCheckoutHistoryTransaction(transaction) {
  return CHECKOUT_HISTORY_TYPES.has(String(transaction?.productType || "").toLowerCase());
}

function checkoutReminderBlockReason(transaction, now = Date.now()) {
  if (!transaction) return "Transaction not found";
  const type = String(transaction.productType || "").toLowerCase();
  if (!CHECKOUT_HISTORY_TYPES.has(type)) return "Not a program payment";
  const status = String(transaction.paymentStatus || "").toLowerCase();
  if (status === "paid") return "This payment is already complete";
  if (status !== "pending") return "This payment is not awaiting";
  if (
    transaction.linkExpiresAt &&
    new Date(transaction.linkExpiresAt).getTime() < now
  ) {
    return "Payment link expired. Trigger a new payment.";
  }
  return null;
}

function toCheckoutHistoryRow(transaction, now = Date.now()) {
  if (!transaction) return null;
  const paid = String(transaction.paymentStatus || "").toLowerCase() === "paid";
  const expired =
    !paid &&
    Boolean(transaction.linkExpiresAt) &&
    new Date(transaction.linkExpiresAt).getTime() < now;
  const method = String(transaction.paymentMethod || "").trim();
  const provider = String(transaction.paymentProvider || "").trim();
  const reference = String(transaction.referenceNumber || "").trim();
  const type = String(transaction.productType || "").toLowerCase();

  let detail;
  if (paid) {
    detail = [method, provider, reference].filter(Boolean).join(" · ") || "Paid";
  } else if (expired) {
    detail = "Payment link expired";
  } else {
    detail = "Triggered to app · Invoice on payment";
  }

  return {
    id: transaction.id,
    program: (() => {
      const name =
        transaction.userSnapshot?.catalogItemName ||
        transaction.userSnapshot?.programTitle ||
        (type === "subscription" ? "App subscription" : "Wellness Program");
      const bundledName = transaction.userSnapshot?.bundledSubscription?.itemName;
      return type === "program" && bundledName ? `${name} + ${bundledName}` : name;
    })(),
    status: paid ? "paid" : "awaiting",
    date: formatCheckoutHistoryDate(transaction.paidAt || transaction.createdAt),
    detail,
    amount: Number(transaction.totalAmount) || 0,
    listed:
      Number(transaction.userSnapshot?.catalogAmount) ||
      Number(transaction.baseAmount) ||
      0,
    discountPct: checkoutDiscountPercent(transaction),
  };
}

async function listCheckoutHistoryForUser(userId, now = Date.now()) {
  if (!userId) return [];
  const result = await listTransactionsByUserId(userId, { page: 1, limit: 50 });
  return (result.items || [])
    .filter(isCheckoutHistoryTransaction)
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
    .map((row) => toCheckoutHistoryRow(row, now))
    .filter(Boolean);
}

module.exports = {
  parseDurationToHours,
  calculateOfferPricing,
  isCheckoutOfferExpired,
  getActiveCoachCheckoutOffer,
  getExpiredCoachCheckoutOffer,
  toPublicCoachProgramOffer,
  resolveBundledSubscription,
  canActorTriggerCheckout,
  deriveCheckoutCoachIds,
  isPendingCheckoutOrderReusable,
  buildUserProgramGetPayload,
  toCheckoutHistoryRow,
  checkoutReminderBlockReason,
  listCheckoutHistoryForUser,
  lookupClientByReferralCode,
  listCheckoutStaff,
  listRecentPwc,
  resolvePwcStaffReferralCode,
  triggerCoachCheckout,
};
