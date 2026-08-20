const AppError = require("../utils/AppError");
const { asyncHandler } = require("../utils/asyncHandler");
const { getUserById } = require("../models/userModel");
const {
  isHealTier,
  isConsultancyOnlyTier,
  isMaintenanceTier,
  isEagleClientCategory,
} = require("../models/userAssignmentLogic");
const { userHasPaidFeatureAccess } = require("../services/paidFeatureAccessService");

function canAccessPaidOnboardingWizard(user) {
  if (isHealTier(user?.userTier)) return true;
  if (isConsultancyOnlyTier(user?.userTier)) return true;
  // Maintenance already completed Heal onboarding — not a wizard candidate.
  if (isMaintenanceTier(user?.userTier)) return false;
  // Eagle skips the 10-step wizard.
  if (isEagleClientCategory(user?.clientCategory)) return false;
  return Boolean(user?.programPurchased);
}

/**
 * Blocks access to paid Heal features unless user is Heal,
 * or Maintenance with an active FY Energy Exchange subscription.
 */
const requireHealTier = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  const allowed = await userHasPaidFeatureAccess(user);
  if (!allowed) {
    throw new AppError(
      isMaintenanceTier(user.userTier)
        ? "Active financial-year app subscription required for this feature"
        : "Seek to Heal subscription required for this feature",
      403
    );
  }

  req.currentUser = user;
  next();
});

/**
 * Eagle accounts only get Personal Details, Internal Parameters, and Nutrition.
 * Apply after requireHealTier on all other paid feature routes.
 */
const forbidEagleClient = asyncHandler(async (req, res, next) => {
  const user = req.currentUser || (await getUserById(req.auth?.sub || req.user?.id));
  if (!user) throw new AppError("Unauthorized", 401);
  if (isEagleClientCategory(user.clientCategory)) {
    throw new AppError(
      "This feature is not available for Eagle accounts",
      403
    );
  }
  req.currentUser = user;
  next();
});

/**
 * Blocks paid-feature access until paid onboarding is finished.
 * Maintenance and Eagle are treated as already onboarded.
 */
const requirePaidOnboardingComplete = asyncHandler(async (req, res, next) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 401);

  const allowed = await userHasPaidFeatureAccess(user);
  if (!allowed) {
    throw new AppError(
      isMaintenanceTier(user.userTier)
        ? "Active financial-year app subscription required for this feature"
        : "Seek to Heal subscription required for this feature",
      403
    );
  }
  if (isMaintenanceTier(user.userTier) || isEagleClientCategory(user.clientCategory)) {
    req.currentUser = user;
    return next();
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

  if (isEagleClientCategory(user.clientCategory)) {
    throw new AppError(
      "This feature is not available for Eagle accounts",
      403
    );
  }

  if (isMaintenanceTier(user.userTier)) {
    const allowed = await userHasPaidFeatureAccess(user);
    if (!allowed) {
      throw new AppError(
        "Active financial-year app subscription required for this feature",
        403
      );
    }
    req.currentUser = user;
    return next();
  }

  if (!canAccessPaidOnboardingWizard(user)) {
    throw new AppError("Complete payment before starting onboarding", 403);
  }

  req.currentUser = user;
  next();
});

module.exports = {
  requireHealTier,
  forbidEagleClient,
  requirePaidOnboardingComplete,
  requirePaidOnboardingPending,
  requirePaidOnboardingAccess,
};
