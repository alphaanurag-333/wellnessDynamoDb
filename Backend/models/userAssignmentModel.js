const {
  getUserById,
  updateUser,
  normalizeUserTier,
} = require("./userModel");
const { getWellnessCoachRecordById } = require("./wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("./assistantWellnessCoachModel");
const { updateReferralCodeOwnerCoachId } = require("./referralCodeModel");
const {
  resolveReassignmentPatch,
  assertHealUserAssignment,
  normalizeAssignedCoachType,
  isPaidClientTier,
} = require("./userAssignmentLogic");

async function validateReassignmentTarget({ assignedCoachId, assignedCoachType, parentCoachId, actingCoachId }) {
  const coachId = String(assignedCoachId || "").trim();
  const coachType = normalizeAssignedCoachType(assignedCoachType);
  const parentId = String(parentCoachId || "").trim();

  if (coachType === "wellness_coach") {
    const coach = await getWellnessCoachRecordById(coachId);
    if (!coach) throw new Error("Wellness coach not found");
    if (coach.status !== "active") throw new Error("Wellness coach is not active");
    if (coachId !== parentId) throw new Error("parentCoachId must match assigned wellness coach id");
    if (actingCoachId && actingCoachId !== coachId) {
      throw new Error("Coach may only assign users within their own hierarchy");
    }
    return;
  }

  if (coachType === "assistant_wellness_coach") {
    const assistant = await getAssistantWellnessCoachById(coachId);
    if (!assistant) throw new Error("Assistant wellness coach not found");
    if (assistant.status !== "active") throw new Error("Assistant wellness coach is not active");
    if (String(assistant.wellnessCoachId || "").trim() !== parentId) {
      throw new Error("parentCoachId must match the assistant's wellnessCoachId");
    }
    if (actingCoachId && actingCoachId !== parentId) {
      throw new Error("Coach may only assign users to assistants under their own account");
    }
    const parentCoach = await getWellnessCoachRecordById(parentId);
    if (!parentCoach) throw new Error("Parent wellness coach not found");
    if (parentCoach.status !== "active") throw new Error("Parent wellness coach is not active");
    return;
  }

  throw new Error("assignedCoachType must be wellness_coach or assistant_wellness_coach");
}

/**
 * Reassign a Heal user's coach. referredBy* fields remain immutable history.
 * Updates ReferralCode.ownerCoachId when the user has a referral code (for future peer referrals).
 */
async function reassignHealUser(
  userId,
  { assignedCoachId, assignedCoachType, parentCoachId, assignmentSource = "admin_manual" },
  options = {}
) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (!isPaidClientTier(user.userTier)) {
    throw new Error("Only consultancy or Heal clients can be reassigned to a coach");
  }

  await validateReassignmentTarget({
    assignedCoachId,
    assignedCoachType,
    parentCoachId,
    actingCoachId: options.actingCoachId || null,
  });

  const patch = resolveReassignmentPatch({
    assignedCoachId,
    assignedCoachType,
    parentCoachId,
    assignmentSource: options.actingCoachId ? "coach_reassign" : assignmentSource,
  });
  const updated = await updateUser(userId, patch);
  assertHealUserAssignment(updated);

  if (updated.referralCode && patch.parentCoachId) {
    await updateReferralCodeOwnerCoachId(updated.referralCode, patch.parentCoachId);
  }

  return updated;
}

/**
 * Admin assigns a pending-admin client to a coach for the first time.
 */
async function assignPendingHealUser(
  userId,
  { assignedCoachId, assignedCoachType, parentCoachId, assignmentSource = "admin_manual" }
) {
  const user = await getUserById(userId);
  if (!user) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (!isPaidClientTier(user.userTier)) {
    throw new Error("Only consultancy or Heal clients can receive coach assignment");
  }

  if (user.assignmentStatus !== "pending_admin") {
    throw new Error("User is not pending admin assignment; use reassignHealUser instead");
  }

  return reassignHealUser(
    userId,
    { assignedCoachId, assignedCoachType, parentCoachId, assignmentSource },
    optionsFromAdmin()
  );
}

function optionsFromAdmin() {
  return { actingCoachId: null };
}

module.exports = {
  validateReassignmentTarget,
  reassignHealUser,
  assignPendingHealUser,
};
