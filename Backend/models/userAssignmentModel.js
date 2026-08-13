const {
  getUserById,
  updateUser,
  normalizeUserTier,
} = require("./userModel");
const { getWellnessCoachRecordById } = require("./wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("./assistantWellnessCoachModel");
const {
  getWellnessCoachByIdResolved,
  getAssistantWellnessCoachByIdResolved,
} = require("../services/accountResolver");
const { updateReferralCodeOwnerCoachId } = require("./referralCodeModel");
const {
  resolveReassignmentPatch,
  assertHealUserAssignment,
  normalizeAssignedCoachType,
  isPaidClientTier,
} = require("./userAssignmentLogic");
const { syncConsultancyAssigneeForUser } = require("../services/consultancyAssigneeSyncService");

async function resolveWellnessCoachTarget(coachId) {
  return (
    (await getWellnessCoachByIdResolved(coachId)) ||
    (await getWellnessCoachRecordById(coachId)) ||
    null
  );
}

async function resolveAssistantTarget(assistantId) {
  return (
    (await getAssistantWellnessCoachByIdResolved(assistantId)) ||
    (await getAssistantWellnessCoachById(assistantId)) ||
    null
  );
}

async function validateReassignmentTarget({ assignedCoachId, assignedCoachType, parentCoachId, actingCoachId }) {
  const coachId = String(assignedCoachId || "").trim();
  const coachType = normalizeAssignedCoachType(assignedCoachType);
  const parentId = String(parentCoachId || "").trim();

  if (coachType === "wellness_coach") {
    const coach = await resolveWellnessCoachTarget(coachId);
    if (!coach) throw new Error("Wellness coach not found");
    if (String(coach.status || "").toLowerCase() !== "active") {
      throw new Error("Wellness coach is not active");
    }
    if (coachId !== parentId) throw new Error("parentCoachId must match assigned wellness coach id");
    if (actingCoachId && actingCoachId !== coachId) {
      throw new Error("Coach may only assign users within their own hierarchy");
    }
    return;
  }

  if (coachType === "assistant_wellness_coach") {
    const assistant = await resolveAssistantTarget(coachId);
    if (!assistant) throw new Error("Assistant wellness coach not found");
    if (String(assistant.status || "").toLowerCase() !== "active") {
      throw new Error("Assistant wellness coach is not active");
    }
    const assistantParent = String(
      assistant.wellnessCoachId || assistant.parentAccountId || ""
    ).trim();
    if (assistantParent !== parentId) {
      throw new Error("parentCoachId must match the assistant's wellnessCoachId");
    }
    if (actingCoachId && actingCoachId !== parentId) {
      throw new Error("Coach may only assign users to assistants under their own account");
    }
    const parentCoach = await resolveWellnessCoachTarget(parentId);
    if (!parentCoach) throw new Error("Parent wellness coach not found");
    if (String(parentCoach.status || "").toLowerCase() !== "active") {
      throw new Error("Parent wellness coach is not active");
    }
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

  try {
    await syncConsultancyAssigneeForUser(userId, {
      assignedCoachId: patch.assignedCoachId,
      assignedCoachType: patch.assignedCoachType,
      parentCoachId: patch.parentCoachId,
    });
  } catch (err) {
    console.error("[UserAssignment] consultancy assignee sync failed", err.message);
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
