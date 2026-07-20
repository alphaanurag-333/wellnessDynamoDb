const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  getUserById,
  updateUser,
} = require("./userModel");
const {
  getReferralCodeRecord,
  registerReferralCode,
  generateUniqueReferralCode,
  updateReferralCodeOwnerCoachId,
} = require("./referralCodeModel");
const { getWellnessCoachRecordById } = require("./wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("./assistantWellnessCoachModel");
const {
  resolveConversionAssignment,
  assertHealUserAssignment,
  normalizeUserTier: normalizeTier,
  isHealTier,
  isConsultancyOnlyTier,
} = require("./userAssignmentLogic");

const IMMUTABLE_HISTORY_FIELDS = [
  "convertedAt",
  "referredByUserId",
  "referredByCode",
  "referredByEntityType",
  "referredByEntityId",
];

/** Omit referral-history fields that were already set (supports admin downgrade → re-upgrade). */
function omitExistingHistoryFields(updates, user) {
  const next = { ...updates };
  for (const key of IMMUTABLE_HISTORY_FIELDS) {
    if (user?.[key] != null && String(user[key]).trim() !== "") {
      delete next[key];
    }
  }
  return next;
}

async function loadReferralContext(referralRecord) {
  if (!referralRecord) return {};

  if (referralRecord.entityType === "wellness_coach") {
    const wellnessCoach = await getWellnessCoachRecordById(referralRecord.entityId);
    return { wellnessCoach };
  }

  if (referralRecord.entityType === "assistant_wellness_coach") {
    const assistantWellnessCoach = await getAssistantWellnessCoachById(referralRecord.entityId);
    return { assistantWellnessCoach };
  }

  if (referralRecord.entityType === "user") {
    const refererUser = await getUserById(referralRecord.entityId);
    return { refererUser };
  }

  return {};
}

/**
 * Ensure the user's referral code exists in the registry and ownerCoachId is current.
 * Reuses the code created at registration when present.
 */
async function ensureUserReferralRegistry(userId, referralCode, ownerCoachId) {
  const code = String(referralCode || "").trim().toUpperCase();
  if (!code) throw new Error("referralCode is required");

  const owner = String(ownerCoachId || "").trim() || "pending";
  const existing = await getReferralCodeRecord(code);

  if (existing) {
    if (String(existing.ownerCoachId || "") !== owner) {
      await updateReferralCodeOwnerCoachId(code, owner);
    }
    return code;
  }

  await registerReferralCode({
    referralCode: code,
    entityType: "user",
    entityId: userId,
    ownerCoachId: owner,
  });
  return code;
}

function resolveReferralCodeInput(user, referralCode) {
  const fromRequest = referralCode ? String(referralCode).trim() : "";
  if (fromRequest) return fromRequest;
  const fromHistory = user?.referredByCode ? String(user.referredByCode).trim() : "";
  return fromHistory;
}

/**
 * Record successful consultancy payment: consultancy_only tier + coach assignment.
 * Does not upgrade to Seek to Heal (subscription).
 */
async function completeConsultancyEnrollment(userId, { referralCode } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (isHealTier(user.userTier)) {
    const err = new Error("User is already a Heal (subscription) member");
    err.name = "AlreadyConvertedError";
    throw err;
  }

  if (isConsultancyOnlyTier(user.userTier)) {
    return user;
  }

  if (normalizeTier(user.userTier) !== "seek") {
    const err = new Error("User cannot enroll in consultancy from current tier");
    err.name = "InvalidTierError";
    throw err;
  }

  const normalizedReferralCode = resolveReferralCodeInput(user, referralCode);
  const referralRecord = normalizedReferralCode
    ? await getReferralCodeRecord(normalizedReferralCode)
    : null;

  const context = await loadReferralContext(referralRecord);
  const assignment = resolveConversionAssignment(referralRecord, context, normalizedReferralCode);
  const now = new Date().toISOString();

  const updates = {
    userTier: "consultancy_only",
    consultancyPaidAt: now,
    referredByUserId: assignment.referredByUserId,
    referredByCode: assignment.referredByCode,
    referredByEntityType: assignment.referredByEntityType,
    referredByEntityId: assignment.referredByEntityId,
    assignedCoachId: assignment.assignedCoachId,
    assignedCoachType: assignment.assignedCoachType,
    parentCoachId: assignment.parentCoachId,
    assignmentStatus: assignment.assignmentStatus,
    assignmentSource: assignment.assignmentSource,
    assignedAt: assignment.assignmentStatus === "assigned" ? now : null,
  };

  const updated = await updateUser(userId, omitExistingHistoryFields(updates, user));
  assertHealUserAssignment(updated);
  return updated;
}

/**
 * Upgrade consultancy_only → Heal (Seek to Heal subscription).
 * Admin may pass allowFromSeek to convert directly without consultancy payment.
 */
async function convertSeekToHeal(userId, { referralCode, allowFromSeek = false } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (isHealTier(user.userTier)) {
    const err = new Error("User is already a Heal (paid) member");
    err.name = "AlreadyConvertedError";
    throw err;
  }

  const tier = normalizeTier(user.userTier);

  if (tier === "consultancy_only") {
    const ownReferralCode = user.referralCode || (await generateUniqueReferralCode());
    const now = new Date().toISOString();
    const parentCoachIdForRegistry = String(user.parentCoachId || "").trim() || null;

    const updates = omitExistingHistoryFields(
      {
        userTier: "heal",
        referralCode: ownReferralCode,
        convertedAt: now,
      },
      user
    );

    const updated = await updateUser(userId, updates);
    assertHealUserAssignment(updated);

    await ensureUserReferralRegistry(
      userId,
      ownReferralCode,
      updated.assignmentStatus === "assigned" && parentCoachIdForRegistry
        ? parentCoachIdForRegistry
        : "pending"
    );

    return updated;
  }

  if (tier === "seek" && !allowFromSeek) {
    const err = new Error("Complete consultancy payment before upgrading to Seek to Heal");
    err.name = "ConsultancyRequiredError";
    throw err;
  }

  const normalizedReferralCode = resolveReferralCodeInput(user, referralCode);
  const referralRecord = normalizedReferralCode
    ? await getReferralCodeRecord(normalizedReferralCode)
    : null;

  const context = await loadReferralContext(referralRecord);
  const assignment = resolveConversionAssignment(referralRecord, context, normalizedReferralCode);

  const ownReferralCode = user.referralCode || (await generateUniqueReferralCode());
  const now = new Date().toISOString();
  const parentCoachIdForRegistry = assignment.parentCoachId || null;

  const updates = omitExistingHistoryFields(
    {
      userTier: "heal",
      referralCode: ownReferralCode,
      convertedAt: now,
      referredByUserId: assignment.referredByUserId,
      referredByCode: assignment.referredByCode,
      referredByEntityType: assignment.referredByEntityType,
      referredByEntityId: assignment.referredByEntityId,
      assignedCoachId: assignment.assignedCoachId,
      assignedCoachType: assignment.assignedCoachType,
      parentCoachId: assignment.parentCoachId,
      assignmentStatus: assignment.assignmentStatus,
      assignmentSource: assignment.assignmentSource,
      assignedAt: assignment.assignmentStatus === "assigned" ? now : null,
    },
    user
  );

  const updated = await updateUser(userId, updates);
  assertHealUserAssignment(updated);

  await ensureUserReferralRegistry(
    userId,
    ownReferralCode,
    assignment.assignmentStatus === "assigned" && parentCoachIdForRegistry
      ? parentCoachIdForRegistry
      : "pending"
  );

  return updated;
}

/**
 * Admin downgrade: Heal (paid subscription) → Seek (free).
 * Clears heal-specific assignment; keeps the user's referral code (issued at registration).
 * Referral history (referredBy*, convertedAt) is kept.
 */
async function convertHealToSeek(userId) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (!isHealTier(user.userTier)) {
    const err = new Error("User is not a Heal (paid) member");
    err.name = "InvalidTierError";
    throw err;
  }

  if (user.referralCode) {
    try {
      await updateReferralCodeOwnerCoachId(user.referralCode, "pending");
    } catch (err) {
      if (err?.name === "ConditionalCheckFailedException") {
        // Registry row missing — recreate with pending owner.
        await ensureUserReferralRegistry(userId, user.referralCode, "pending");
      } else {
        throw err;
      }
    }
  }

  const updates = {
    userTier: "seek",
    assignedCoachId: null,
    assignedCoachType: null,
    parentCoachId: null,
    assignmentStatus: null,
    assignmentSource: null,
    assignedAt: null,
    healPaidAt: null,
    paidOnboardingCompleted: false,
    paidOnboardingStep: null,
    paidOnboardingStepStatus: null,
    energyExchangeEnabled: false,
    programEnabled: false,
    programPurchased: false,
    programPurchasedAt: null,
    assignedProgramId: null,
  };

  return updateUser(userId, updates);
}

module.exports = {
  loadReferralContext,
  completeConsultancyEnrollment,
  convertSeekToHeal,
  convertHealToSeek,
  omitExistingHistoryFields,
};
