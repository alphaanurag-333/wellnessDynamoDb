const AppError = require("../utils/AppError");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  handleValidationError,
} = require("./reminderControllerHelpers");

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

module.exports = {
  readUserIdParam,
  loadTargetUser,
  assertHealTierUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  handleValidationError,
  resolveCoachIdForUser,
};
