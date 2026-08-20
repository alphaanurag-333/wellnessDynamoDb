const { isHealTier, isMaintenanceTier, isEagleClientCategory } = require("../models/userAssignmentLogic");
const { listSubscriptionsByUserId } = require("../models/energyExchangeSubscriptionModel");

async function hasActiveEnergyExchangeSubscription(userId) {
  if (!userId) return false;
  const result = await listSubscriptionsByUserId(userId, { status: "active", page: 1, limit: 10 });
  const now = Date.now();
  return (result.items || []).some((sub) => {
    if (String(sub.status || "").toLowerCase() !== "active") return false;
    if (!sub.endsAt) return true;
    const ends = new Date(sub.endsAt).getTime();
    return Number.isFinite(ends) ? ends >= now : true;
  });
}

/**
 * Heal users always have paid-feature access.
 * Maintenance users need an active FY Energy Exchange subscription.
 */
async function userHasPaidFeatureAccess(user) {
  if (!user) return false;
  if (isHealTier(user.userTier)) return true;
  // Eagle clients keep Personal Details / Internal Parameters / Nutrition / Counselling.
  if (isEagleClientCategory(user.clientCategory)) return true;
  if (!isMaintenanceTier(user.userTier)) return false;
  return hasActiveEnergyExchangeSubscription(user.id);
}

/**
 * Staff coaching can work with Heal or Maintenance clients
 * (Maintenance is a past Heal user staying on the roster).
 */
function isStaffPaidFeatureTier(userOrTier) {
  const tier =
    userOrTier && typeof userOrTier === "object" ? userOrTier.userTier : userOrTier;
  return isHealTier(tier) || isMaintenanceTier(tier);
}

module.exports = {
  hasActiveEnergyExchangeSubscription,
  userHasPaidFeatureAccess,
  isStaffPaidFeatureTier,
};
