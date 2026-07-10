const { getUserById, updateUser } = require("../models/userModel");
const { convertSeekToHeal } = require("../models/userConversionModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const {
  listActiveProgramCatalog,
  getProgramCatalogRecordById,
} = require("../models/programCatalogModel");
const {
  createUserProgram,
  cancelAssignedProgramsForUser,
  getActiveProgramForUser,
  updateUserProgram,
  normalizeStatus,
} = require("../models/userProgramModel");
const {
  createProgram,
  listProgramsByUserId,
  updateProgram,
} = require("../models/energyExchangeProgramModel");
const { getAppConfig } = require("../models/appConfigModel");

async function resolveCatalogProgram(catalogProgramId) {
  const requestedId = String(catalogProgramId || "").trim();
  if (requestedId) {
    const catalog = await getProgramCatalogRecordById(requestedId);
    if (!catalog || catalog.status !== "active") {
      const err = new Error("Program catalog entry not found or inactive");
      err.name = "ValidationError";
      throw err;
    }
    return catalog;
  }

  const programs = await listActiveProgramCatalog();
  const catalog = programs[0] || null;
  if (!catalog) {
    const err = new Error("No active Wellness Program is configured in the catalog");
    err.name = "ValidationError";
    throw err;
  }
  return catalog;
}

async function ensureWellnessProgramForPaidClient(user, { catalogProgramId, now } = {}) {
  const userId = user.id;
  const coachId = String(user.parentCoachId || "").trim();
  if (!coachId) return user;

  if (user.programPurchased) {
    if (!user.programEnabled && user.assignedProgramId) {
      await updateUserProgram(user.assignedProgramId, { enabled: true });
      return updateUser(userId, { programEnabled: true });
    }
    return user;
  }

  const existing = await getActiveProgramForUser(userId);
  if (existing && normalizeStatus(existing.status) === "assigned") {
    const purchasedAt = now || new Date().toISOString();
    await updateUserProgram(existing.id, {
      status: "purchased",
      purchasedAt,
      enabled: true,
    });
    return updateUser(userId, {
      assignedProgramId: existing.id,
      programEnabled: true,
      programPurchased: true,
      programPurchasedAt: purchasedAt,
    });
  }

  if (existing && normalizeStatus(existing.status) === "purchased") {
    return updateUser(userId, {
      assignedProgramId: existing.id,
      programEnabled: true,
      programPurchased: true,
      programPurchasedAt: existing.purchasedAt || now || new Date().toISOString(),
    });
  }

  const catalog = await resolveCatalogProgram(catalogProgramId);
  const purchasedAt = now || new Date().toISOString();

  await cancelAssignedProgramsForUser(userId);

  const program = await createUserProgram({
    userId,
    coachId,
    coachType: "wellness_coach",
    catalogProgramId: catalog.id,
    title: catalog.title,
    programType: catalog.programType,
    description: catalog.description,
    price: catalog.price,
    currency: catalog.currency,
    enabled: true,
    status: "purchased",
    purchasedAt,
  });

  return updateUser(userId, {
    assignedProgramId: program.id,
    programEnabled: true,
    programPurchased: true,
    programPurchasedAt: purchasedAt,
  });
}

async function ensureEnergyExchangeForPaidClient(user) {
  const userId = user.id;
  const coachId = String(user.parentCoachId || "").trim();
  if (!coachId) return user;

  if (user.energyExchangeEnabled) return user;

  const existing = await listProgramsByUserId(userId, { page: 1, limit: 50 });
  const coachProgram =
    existing.items.find((row) => String(row.coachId) === coachId) || existing.items[0] || null;

  if (coachProgram) {
    if (!coachProgram.enabled) {
      await updateProgram(coachProgram.id, { enabled: true });
    }
  } else {
    const appConfig = await getAppConfig();
    await createProgram({
      userId,
      coachId,
      coachType: "wellness_coach",
      enabled: true,
      monthlyAmount: Number(appConfig?.energy_exchange_monthly_amount) || 0,
      currency: "INR",
      fyDiscounts: appConfig?.energy_exchange_default_fy_discounts || {},
    });
  }

  return updateUser(userId, { energyExchangeEnabled: true });
}

/**
 * Ensure wellness program + energy exchange records exist for an admin-promoted paid client.
 * Requires parentCoachId on the user (assign coach first when conversion used pending assignment).
 */
async function setupPaidClientEntitlements(user, { catalogProgramId, now } = {}) {
  if (!user?.id) return user;

  let current = user;
  current = await ensureWellnessProgramForPaidClient(current, { catalogProgramId, now });
  current = await ensureEnergyExchangeForPaidClient(current);
  return current;
}

/**
 * Admin Seek/Consultancy → Heal with the same post-payment state as Energy Exchange checkout:
 * tier upgrade, program assignment/purchase, energy exchange enablement, paid onboarding bootstrap.
 */
async function adminConvertUserToHeal(userId, { referralCode, catalogProgramId } = {}) {
  const userBefore = await getUserById(userId);
  if (!userBefore) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  const tier = normalizeUserTier(userBefore.userTier);
  const user = await convertSeekToHeal(userId, {
    referralCode,
    allowFromSeek: tier === "seek",
  });

  const now = new Date().toISOString();
  let refreshed = user;

  if (String(user.parentCoachId || "").trim()) {
    refreshed = await setupPaidClientEntitlements(user, { catalogProgramId, now });
  }

  const patches = {
    healPaidAt: now,
    paidOnboardingCompleted: false,
    paidOnboardingStep: "register",
    paidOnboardingStepStatus: null,
  };

  if (!refreshed.consultancyPaidAt) {
    patches.consultancyPaidAt = now;
  }

  return updateUser(userId, patches);
}

module.exports = {
  adminConvertUserToHeal,
  setupPaidClientEntitlements,
  ensureWellnessProgramForPaidClient,
  ensureEnergyExchangeForPaidClient,
};
