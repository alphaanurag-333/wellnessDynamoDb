const AppError = require("../../utils/AppError");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  handleValidationError,
} = require("./reminderControllerHelpers");
const { assertStaffCanAccessUser, resolveStaffActor } = require("../staffAccess");

function assertHealTierUser(user) {
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Diet plans can only be assigned to Heal (paid) users", 400);
  }
}

function resolveCoachIdForUser(user) {
  const coachId = String(user.parentCoachId || "").trim();
  if (!coachId) {
    throw new AppError("User does not have an assigned coach hierarchy", 400);
  }
  return coachId;
}

async function assertStaffHealUserAccess(req, { requireHealTier = false } = {}) {
  const actor = resolveStaffActor(req);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  if (requireHealTier) assertHealTierUser(user);
  return { actingId: actor.id, userId, user, actor };
}

module.exports = {
  readUserIdParam,
  loadTargetUser,
  assertHealTierUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertStaffCanAccessUser,
  assertStaffHealUserAccess,
  resolveStaffActor,
  handleValidationError,
  resolveCoachIdForUser,
};
