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

/**
 * Blocks paid-feature access until paid onboarding is finished.
 */
const requirePaidOnboardingComplete = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  if (!isHealTier(user.userTier)) {
    throw new AppError("Seek to Heal subscription required for this feature", 403);
  }
  if (!user.paidOnboardingCompleted) {
    throw new AppError("Complete paid onboarding to access this feature", 403);
  }

  req.currentUser = user;
  next();
});

/**
 * Restricts onboarding endpoints to users who still need onboarding —
 * heal tier with paidOnboardingCompleted=false.
 */
const requirePaidOnboardingPending = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  if (!isHealTier(user.userTier)) {
    throw new AppError("Energy Exchange purchase is required first", 403);
  }
  if (user.paidOnboardingCompleted) {
    throw new AppError("Paid onboarding already completed", 409);
  }

  req.currentUser = user;
  next();
});

module.exports = {
  requireHealTier,
  requirePaidOnboardingComplete,
  requirePaidOnboardingPending,
};
