const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { isHealTier } = require("../models/userAssignmentLogic");

/**
 * Blocks access to Seek to Heal (subscription) features unless userTier is heal.
 */
const requireHealTier = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  if (!isHealTier(user.userTier)) {
    throw new AppError("Seek to Heal subscription required for this feature", 403);
  }

  req.currentUser = user;
  next();
});

module.exports = {
  requireHealTier,
};
