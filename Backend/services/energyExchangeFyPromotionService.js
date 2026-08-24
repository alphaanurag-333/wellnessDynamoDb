const subscriptionModel = require("../models/energyExchangeSubscriptionModel");
const userModel = require("../models/userModel");
const userConversionModel = require("../models/userConversionModel");
const { isMaintenanceTier } = require("../models/userAssignmentLogic");

/**
 * Promote energy-exchange subscriptions across the FY boundary.
 *
 *  - Mark every active subscription with `endsAt <= now` as `expired`.
 *  - For each affected user, take the earliest `queued` subscription and promote
 *    it to `active` with `activatedAt=now`. (We don't shift `startsAt`/`endsAt`
 *    on the queued row — those were precomputed at purchase to follow the next
 *    FY boundaries.)
 *  - If a Maintenance user still has no active/queued coverage after that,
 *    convert them to Seek (free) — subscription expiry ends paid membership.
 */
async function runEnergyExchangeFyPromotion(now = new Date()) {
  const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
  const nowMs = new Date(nowIso).getTime();
  const result = {
    expiredAt: nowIso,
    expired: 0,
    activated: 0,
    convertedToSeek: 0,
    users: 0,
    errors: 0,
  };

  const expiring = await subscriptionModel.listActiveSubscriptionsEndingBefore(nowIso);
  const affectedUserIds = new Set();

  for (const sub of expiring) {
    try {
      await subscriptionModel.updateSubscription(sub.id, {
        status: "expired",
        expiredAt: nowIso,
      });
      result.expired += 1;
      affectedUserIds.add(String(sub.userId));
    } catch (err) {
      console.error("[fy-promotion] failed expiring subscription", sub.id, err.message);
      result.errors += 1;
    }
  }

  for (const userId of affectedUserIds) {
    try {
      const queued = await subscriptionModel.listSubscriptionsByUserId(userId, {
        status: "queued",
      });
      const ordered = [...queued.items].sort(
        (a, b) => Number(a.fyStartYear) - Number(b.fyStartYear)
      );
      if (ordered.length === 0) continue;

      const next = ordered[0];
      await subscriptionModel.updateSubscription(next.id, {
        status: "active",
        activatedAt: nowIso,
      });
      result.activated += 1;
    } catch (err) {
      console.error("[fy-promotion] failed activating queued for user", userId, err.message);
      result.errors += 1;
    }
  }

  for (const userId of affectedUserIds) {
    try {
      const converted = await maybeConvertExpiredUserToSeek(userId, nowMs);
      if (converted) result.convertedToSeek += 1;
    } catch (err) {
      console.error("[fy-promotion] failed Seek conversion for user", userId, err.message);
      result.errors += 1;
    }
  }

  result.users = affectedUserIds.size;
  return result;
}

function subscriptionStillCovers(sub, nowMs) {
  if (!sub) return false;
  const status = String(sub.status || "").toLowerCase();
  if (!["active", "queued"].includes(status)) return false;
  if (sub.endsAt) {
    const ends = new Date(sub.endsAt).getTime();
    if (Number.isFinite(ends) && ends < nowMs) return false;
  }
  return true;
}

/**
 * After expiry (+ optional queued activation), Maintenance users with no remaining
 * FY coverage drop to Seek.
 */
async function maybeConvertExpiredUserToSeek(userId, nowMs = Date.now()) {
  const user = await userModel.getUserById(userId);
  if (!user || !isMaintenanceTier(user.userTier)) return false;

  const { items = [] } = await subscriptionModel.listSubscriptionsByUserId(userId, {
    page: 1,
    limit: 50,
  });
  const hasCoverage = items.some((sub) => subscriptionStillCovers(sub, nowMs));
  if (hasCoverage) return false;

  await userConversionModel.convertMaintenanceToSeek(userId);
  return true;
}

module.exports = {
  runEnergyExchangeFyPromotion,
  maybeConvertExpiredUserToSeek,
};
