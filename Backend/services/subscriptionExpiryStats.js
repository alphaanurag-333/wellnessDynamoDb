const {
  listActiveSubscriptionsEndingBefore,
} = require("../models/energyExchangeSubscriptionModel");
const { getUserById, isDeletedUser } = require("../models/userModel");

const DEFAULT_WINDOW_DAYS = 15;

function daysUntil(endsAt, now = new Date()) {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Active subscriptions ending within the next `windowDays` (inclusive).
 * Counts unique live users; `soonestDays` is the minimum days-left among them.
 * Missing or archived clients (`status: "deleted"`) are excluded so dashboard
 * cards match Users drill-down (which also drops those rows).
 */
async function getSubscriptionExpiryStats({
  userIds = null,
  windowDays = DEFAULT_WINDOW_DAYS,
  now = new Date(),
} = {}) {
  const window = Math.max(1, Number(windowDays) || DEFAULT_WINDOW_DAYS);
  const cutoff = new Date(now.getTime() + window * 24 * 60 * 60 * 1000);
  const rows = await listActiveSubscriptionsEndingBefore(cutoff.toISOString());
  const allow = Array.isArray(userIds)
    ? new Set(userIds.map((id) => String(id || "").trim()).filter(Boolean))
    : null;

  const soonestByUser = new Map();
  for (const row of rows || []) {
    const userId = String(row?.userId || "").trim();
    if (!userId) continue;
    if (allow && !allow.has(userId)) continue;
    const daysLeft = daysUntil(row.endsAt, now);
    if (daysLeft == null || daysLeft < 0 || daysLeft > window) continue;
    const prev = soonestByUser.get(userId);
    if (prev == null || daysLeft < prev) soonestByUser.set(userId, daysLeft);
  }

  if (soonestByUser.size) {
    const lookups = await Promise.all(
      [...soonestByUser.keys()].map(async (id) => {
        try {
          const user = await getUserById(id);
          return { id, keep: Boolean(user) && !isDeletedUser(user) };
        } catch (err) {
          console.warn(
            "[subscriptionExpiryStats] getUserById failed:",
            id,
            err?.message || err
          );
          return { id, keep: false };
        }
      })
    );
    for (const { id, keep } of lookups) {
      if (!keep) soonestByUser.delete(id);
    }
  }

  let soonestDays = null;
  for (const days of soonestByUser.values()) {
    if (soonestDays == null || days < soonestDays) soonestDays = days;
  }

  return {
    count: soonestByUser.size,
    soonestDays,
    windowDays: window,
    userIds: [...soonestByUser.keys()],
  };
}

module.exports = {
  DEFAULT_WINDOW_DAYS,
  getSubscriptionExpiryStats,
};
