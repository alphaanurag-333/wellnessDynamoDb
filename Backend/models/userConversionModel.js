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
 * Convert a Seek user to Heal (paid) and resolve coach assignment at write time.
 * Does not change Seek self-registration; call only from the paid upgrade flow.
 */
async function convertSeekToHeal(userId, { referralCode } = {}) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (normalizeTier(user.userTier) === "heal") {
    const err = new Error("User is already a Heal (paid) member");
    err.name = "AlreadyConvertedError";
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
  convertSeekToHeal,
};
