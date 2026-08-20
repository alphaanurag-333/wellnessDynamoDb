const { getAppConfig } = require("../models/appConfigModel");
const { getUserById, updateUser } = require("../models/userModel");
const {
  createProgram,
  listProgramsByUserId,
  updateProgram,
  getEnabledProgramForUser,
} = require("../models/energyExchangeProgramModel");
const {
  createSubscription,
  listSubscriptionsByUserId,
  updateSubscription,
} = require("../models/energyExchangeSubscriptionModel");
const {
  buildFyPlansForProgram,
} = require("./energyExchangePricingService");

/**
 * Ensure the user has an enabled Energy Exchange program (for FY app subscription).
 */
async function ensureEnergyExchangeProgramForUser(user) {
  if (!user?.id) return null;

  const enabled = await getEnabledProgramForUser(user.id);
  if (enabled) {
    if (!user.energyExchangeEnabled) {
      await updateUser(user.id, { energyExchangeEnabled: true });
    }
    return enabled;
  }

  const existing = await listProgramsByUserId(user.id, { page: 1, limit: 50 });
  const coachId = String(user.parentCoachId || "").trim();
  const coachProgram =
    existing.items.find((row) => String(row.coachId) === coachId) || existing.items[0] || null;

  if (coachProgram) {
    const updated = await updateProgram(coachProgram.id, { enabled: true });
    await updateUser(user.id, { energyExchangeEnabled: true });
    return updated;
  }

  if (!coachId) return null;

  const appConfig = await getAppConfig();
  const program = await createProgram({
    userId: user.id,
    coachId,
    coachType: "wellness_coach",
    enabled: true,
    monthlyAmount: Number(appConfig?.energy_exchange_monthly_amount) || 0,
    currency: "INR",
    fyDiscounts: appConfig?.energy_exchange_default_fy_discounts || {},
  });
  await updateUser(user.id, { energyExchangeEnabled: true });
  return program;
}

function subscriptionCoversNow(sub, nowMs = Date.now()) {
  if (!sub) return false;
  const status = String(sub.status || "").toLowerCase();
  if (!["active", "queued", "pending"].includes(status)) return false;
  if (sub.endsAt) {
    const ends = new Date(sub.endsAt).getTime();
    if (Number.isFinite(ends) && ends < nowMs) return false;
  }
  if (sub.startsAt) {
    const starts = new Date(sub.startsAt).getTime();
    if (Number.isFinite(starts) && starts > nowMs) return false;
  }
  return true;
}

/**
 * After Heal → Maintenance: keep paid app access for the current FY.
 * Reuses an existing covering EE subscription (activates if queued).
 * If Heal never created FY rows (program-only), grants current FY complimentary.
 */
async function ensureCurrentFyAccessForMaintenance(user) {
  if (!user?.id) return null;

  const program = await ensureEnergyExchangeProgramForUser(user);
  if (!program) return null;

  const existing = await listSubscriptionsByUserId(user.id, { page: 1, limit: 500 });
  const items = existing.items || [];
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();

  const covering = items.find((sub) => subscriptionCoversNow(sub, nowMs));
  if (covering) {
    if (String(covering.status || "").toLowerCase() !== "active") {
      return updateSubscription(covering.id, {
        status: "active",
        activatedAt: covering.activatedAt || nowIso,
      });
    }
    return covering;
  }

  const { plans } = await buildFyPlansForProgram(program.id);
  const current = plans.find((p) => Number(p.offset) === 1) || plans[0];
  if (!current) return null;

  const sameYear = items.find(
    (sub) =>
      Number(sub.fyStartYear) === Number(current.fyStartYear) &&
      ["active", "queued", "pending"].includes(String(sub.status || "").toLowerCase()),
  );
  if (sameYear) {
    return updateSubscription(sameYear.id, {
      status: "active",
      activatedAt: sameYear.activatedAt || nowIso,
      startsAt: sameYear.startsAt || current.startsAt,
      endsAt: sameYear.endsAt || current.endsAt,
    });
  }

  return createSubscription({
    userId: user.id,
    programId: program.id,
    transactionId: null,
    fyStartYear: current.fyStartYear,
    monthsCovered: current.monthsCovered,
    monthlyRate: current.monthlyAmount,
    discountPercent: current.effectiveDiscountPercent,
    fyTierDiscountPercent: current.fyTierDiscountPercent,
    timeBasedDiscountPercent: current.timeBasedDiscountPercent,
    baseAmount: current.baseAmount,
    discountAmount: current.discountAmount,
    taxAmount: current.taxAmount,
    taxPercent: current.taxPercent,
    taxType: current.taxType,
    totalAmount: 0,
    currency: current.currency || "INR",
    startsAt: current.startsAt,
    endsAt: current.endsAt,
    status: "active",
    activatedAt: nowIso,
  });
}

/**
 * Grant current-FY Energy Exchange subscription when bundled into program checkout.
 * Amount was already included in the program price (includedInProgramPrice).
 */
async function grantBundledFyAppSubscription(user, transaction, bundled) {
  if (!bundled?.enabled) return null;

  const latest = (await getUserById(user.id)) || user;
  const program = await ensureEnergyExchangeProgramForUser(latest);
  if (!program) return null;

  const { plans } = await buildFyPlansForProgram(program.id);
  const offsets = Array.isArray(bundled.fyOffsets) && bundled.fyOffsets.length
    ? bundled.fyOffsets.map((n) => Number(n))
    : [0];

  const existing = await listSubscriptionsByUserId(latest.id, { page: 1, limit: 500 });
  const ownedYears = new Set(
    existing.items
      .filter((s) => ["queued", "active", "pending"].includes(String(s.status).toLowerCase()))
      .map((s) => Number(s.fyStartYear)),
  );

  const now = new Date().toISOString();
  const created = [];

  for (const offset of offsets) {
    // plans use 1-based offset in pricing service (offset field = offset+1)
    const plan = plans.find((p) => Number(p.offset) === Number(offset) + 1) || plans[offset];
    if (!plan) continue;
    if (ownedYears.has(Number(plan.fyStartYear))) continue;

    const status = created.length === 0 && offsets.indexOf(offset) === 0 ? "active" : "queued";
    const sub = await createSubscription({
      userId: latest.id,
      programId: program.id,
      transactionId: transaction?.id || null,
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
      totalAmount: 0, // included in program price
      currency: plan.currency || "INR",
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
      status,
      activatedAt: status === "active" ? now : null,
    });
    created.push(sub);
    ownedYears.add(Number(plan.fyStartYear));
  }

  return { program, subscriptions: created };
}

module.exports = {
  ensureEnergyExchangeProgramForUser,
  ensureCurrentFyAccessForMaintenance,
  grantBundledFyAppSubscription,
};
