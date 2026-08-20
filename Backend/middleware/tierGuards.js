const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const { isHealTier, isConsultancyOnlyTier } = require("../models/userAssignmentLogic");

function canAccessPaidOnboardingWizard(user) {
  if (isHealTier(user?.userTier)) return true;
  if (isConsultancyOnlyTier(user?.userTier)) return true;
  return Boolean(user?.programPurchased);
}

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
 * Restricts wizard endpoints to users who still need onboarding.
 * Heal, complimentary Heal, consultancy (post-PWC), and program purchase
 * all land on this wizard — Energy Exchange is not the gate.
 */
const requirePaidOnboardingPending = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  if (!canAccessPaidOnboardingWizard(user)) {
    throw new AppError("Complete payment before starting onboarding", 403);
  }
  if (user.paidOnboardingCompleted) {
    throw new AppError("Paid onboarding already completed", 409);
  }

  req.currentUser = user;
  next();
});

/**
 * Allows paid body-analytics updates both during and after onboarding
 * (sidebar: body measurements, 180° view, medical conditions).
 */
const requirePaidOnboardingAccess = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  if (!canAccessPaidOnboardingWizard(user)) {
    throw new AppError("Complete payment before starting onboarding", 403);
  }

  req.currentUser = user;
  next();
});

module.exports = {
  requireHealTier,
  requirePaidOnboardingComplete,
  requirePaidOnboardingPending,
  requirePaidOnboardingAccess,
};
