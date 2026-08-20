const {
  listActiveSubscriptionsEndingBefore,
} = require("../models/energyExchangeSubscriptionModel");

const DEFAULT_WINDOW_DAYS = 15;

function daysUntil(endsAt, now = new Date()) {
  const end = new Date(endsAt);
  if (Number.isNaN(end.getTime())) return null;
  return Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * Active subscriptions ending within the next `windowDays` (inclusive).
 * Counts unique users; `soonestDays` is the minimum days-left among them.
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
