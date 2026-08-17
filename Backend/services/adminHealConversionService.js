const { getUserById, updateUser } = require("../models/userModel");
const { convertSeekToHeal } = require("../models/userConversionModel");
const { normalizeUserTier } = require("../models/userAssignmentLogic");
const {
  listActiveProgramCatalog,
  getProgramCatalogRecordById,
} = require("../models/programCatalogModel");
const { getHealthConcernRecordById } = require("../models/healthConcernModel");
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
const { emitPendingAssignment } = require("./adminActivityService");

function normalizeProgramLookupText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findProgramForConcern(programs, concernTitle) {
  const concern = normalizeProgramLookupText(concernTitle);
  if (!concern) return null;

  const matchers = [
    { concern: /\bdiabetes\b/, program: /\bdiabetes\b/ },
    { concern: /\b(fat loss|weight loss)\b/, program: /\b(fat loss|weight loss)\b/ },
    { concern: /\bthyroid\b/, program: /\bthyroid\b/ },
    { concern: /\b(pcod|pcos)\b/, program: /\b(pcod|pcos|hormonal)\b/ },
    { concern: /\bhypertension\b|\bblood pressure\b/, program: /\b(heart|hypertension|blood pressure)\b/ },
    { concern: /\bgut\b|\bdigest/, program: /\b(gut|digest)\w*/ },
    { concern: /\boverall wellbeing\b|\beveryday wellness\b/, program: /\bseek to heal\b/ },
  ];
  const matcher = matchers.find((entry) => entry.concern.test(concern));
  if (matcher) {
    const matched = programs.find((program) =>
      matcher.program.test(normalizeProgramLookupText(program.title))
    );
    if (matched) return matched;
  }

  const meaningfulTokens = concern
    .split(" ")
    .filter((token) => token.length > 3 && !["care", "health", "wellness"].includes(token));
  if (!meaningfulTokens.length) return null;
  return (
    programs.find((program) => {
      const title = normalizeProgramLookupText(program.title);
      return meaningfulTokens.every((token) => title.includes(token));
    }) || null
  );
}

async function resolveCatalogProgram(catalogProgramId, user) {
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

  const concernId = String(user?.primaryHealthConcern || "").trim();
  const concern = concernId ? await getHealthConcernRecordById(concernId) : null;
  const recommendedId = String(concern?.recommendedCatalogProgramId || "").trim();
  if (recommendedId) {
    const recommended = await getProgramCatalogRecordById(recommendedId);
    if (!recommended || recommended.status !== "active") {
      const err = new Error(
        `The program configured for ${concern.title || "this health concern"} is inactive or missing`
      );
      err.name = "ValidationError";
      throw err;
    }
    return recommended;
  }

  const programs = await listActiveProgramCatalog();
  const catalog = findProgramForConcern(programs, concern?.title);
  if (!catalog) {
    const concernLabel = concern?.title || "the selected health concern";
    const err = new Error(
      `No active Wellness Program is mapped to ${concernLabel}. Configure a recommended program on the health concern.`
    );
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

  const catalog = await resolveCatalogProgram(catalogProgramId, user);
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

  const updated = await updateUser(userId, patches);
  if (String(updated.assignmentStatus || "").trim() === "pending_admin") {
    emitPendingAssignment(updated);
  }
  return updated;
}

module.exports = {
  adminConvertUserToHeal,
  setupPaidClientEntitlements,
  ensureWellnessProgramForPaidClient,
  ensureEnergyExchangeForPaidClient,
  findProgramForConcern,
  resolveCatalogProgram,
};
