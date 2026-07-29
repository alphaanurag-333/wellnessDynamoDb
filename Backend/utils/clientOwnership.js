const AppError = require("./AppError");
const { getUserById } = require("../models/userModel");

/**
 * Whether the panel account may access this client row.
 * Admins (including sub-admins) pass; coaches need parentCoachId match;
 * assistants need assignedCoachId + type match.
 */
function canAccessClient(auth, user) {
  if (!auth || !user) return false;
  if (auth.accountType === "admin" || auth.role === "admin") return true;

  const userId = String(user.id || user._id || "").trim();
  if (!userId) return false;

  if (auth.accountType === "wellness_coach") {
    return String(user.parentCoachId || "").trim() === String(auth.sub || "").trim();
  }

  if (auth.accountType === "assistant_wellness_coach") {
    return (
      String(user.assignedCoachId || "").trim() === String(auth.sub || "").trim() &&
      String(user.assignedCoachType || "").trim() === "assistant_wellness_coach"
    );
  }

  return false;
}

async function assertCanAccessClient(auth, userId) {
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!canAccessClient(auth, user)) {
    throw new AppError("You do not have access to this client", 403);
  }
  return user;
}

function isScopedCareOperator(auth) {
  const type = auth?.accountType || auth?.role;
  return type === "wellness_coach" || type === "assistant_wellness_coach";
}

module.exports = {
  canAccessClient,
  assertCanAccessClient,
  isScopedCareOperator,
};
