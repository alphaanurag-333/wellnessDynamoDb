const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  getUserById,
  updateUser,
} = require("./userModel");
const { getReferralCodeRecord, registerReferralCode, generateUniqueReferralCode } = require("./referralCodeModel");
const { getWellnessCoachRecordById } = require("./wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("./assistantWellnessCoachModel");
const {
  resolveConversionAssignment,
  assertHealUserAssignment,
  normalizeUserTier: normalizeTier,
  isHealTier,
  isConsultancyOnlyTier,
} = require("./userAssignmentLogic");

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

  const normalizedReferralCode = referralCode ? String(referralCode).trim() : "";
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

  const updated = await updateUser(userId, updates);
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
    const newReferralCode = await generateUniqueReferralCode();
    const now = new Date().toISOString();
    const parentCoachIdForRegistry = String(user.parentCoachId || "").trim() || null;

    const updates = {
      userTier: "heal",
      referralCode: newReferralCode,
      convertedAt: now,
    };

    const updated = await updateUser(userId, updates);
    assertHealUserAssignment(updated);

    if (updated.assignmentStatus === "assigned" && parentCoachIdForRegistry) {
      await registerReferralCode({
        referralCode: newReferralCode,
        entityType: "user",
        entityId: userId,
        ownerCoachId: parentCoachIdForRegistry,
      });
    } else {
      await registerReferralCode({
        referralCode: newReferralCode,
        entityType: "user",
        entityId: userId,
        ownerCoachId: "pending",
      });
    }

    return updated;
  }

  if (tier === "seek" && !allowFromSeek) {
    const err = new Error("Complete consultancy payment before upgrading to Seek to Heal");
    err.name = "ConsultancyRequiredError";
    throw err;
  }

  const normalizedReferralCode = referralCode ? String(referralCode).trim() : "";
  const referralRecord = normalizedReferralCode
    ? await getReferralCodeRecord(normalizedReferralCode)
    : null;

  const context = await loadReferralContext(referralRecord);
  const assignment = resolveConversionAssignment(referralRecord, context, normalizedReferralCode);

  const newReferralCode = await generateUniqueReferralCode();
  const now = new Date().toISOString();
  const parentCoachIdForRegistry = assignment.parentCoachId || null;

  const updates = {
    userTier: "heal",
    referralCode: newReferralCode,
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
  };

  const updated = await updateUser(userId, updates);
  assertHealUserAssignment(updated);

  if (assignment.assignmentStatus === "assigned") {
    await registerReferralCode({
      referralCode: newReferralCode,
      entityType: "user",
      entityId: userId,
      ownerCoachId: parentCoachIdForRegistry,
    });
  } else {
    await registerReferralCode({
      referralCode: newReferralCode,
      entityType: "user",
      entityId: userId,
      ownerCoachId: "pending",
    });
  }

  return updated;
}

module.exports = {
  loadReferralContext,
  completeConsultancyEnrollment,
  convertSeekToHeal,
};
