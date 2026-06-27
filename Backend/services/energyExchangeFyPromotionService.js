const {
  listActiveSubscriptionsEndingBefore,
  listSubscriptionsByUserId,
  updateSubscription,
} = require("../models/energyExchangeSubscriptionModel");

/**
 * Promote energy-exchange subscriptions across the FY boundary.
 *
 *  - Mark every active subscription with `endsAt <= now` as `expired`.
 *  - For each affected user, take the earliest `queued` subscription and promote
 *    it to `active` with `activatedAt=now`. (We don't shift `startsAt`/`endsAt`
 *    on the queued row — those were precomputed at purchase to follow the next
 *    FY boundaries.)
 */
async function runEnergyExchangeFyPromotion(now = new Date()) {
  const nowIso = (now instanceof Date ? now : new Date(now)).toISOString();
  const expiring = await listActiveSubscriptionsEndingBefore(nowIso);
  const result = {
    expiredAt: nowIso,
    expired: 0,
    activated: 0,
    users: 0,
    errors: 0,
  };

  const affectedUserIds = new Set();

  for (const sub of expiring) {
    try {
      await updateSubscription(sub.id, {
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
      const queued = await listSubscriptionsByUserId(userId, { status: "queued" });
      const ordered = [...queued.items].sort(
        (a, b) => Number(a.fyStartYear) - Number(b.fyStartYear)
      );
      if (ordered.length === 0) continue;

      const next = ordered[0];
      await updateSubscription(next.id, {
        status: "active",
        activatedAt: nowIso,
      });
      result.activated += 1;
    } catch (err) {
      console.error("[fy-promotion] failed activating queued for user", userId, err.message);
      result.errors += 1;
    }
  }

  result.users = affectedUserIds.size;
  return result;
}

module.exports = {
  runEnergyExchangeFyPromotion,
};
