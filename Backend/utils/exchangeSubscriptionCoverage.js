const DURATION_ELIGIBLE_STATUSES = new Set(["active", "queued", "pending"]);

function parseInstantMs(iso) {
  if (!iso) return NaN;
  const t = new Date(iso).getTime();
  return Number.isFinite(t) ? t : NaN;
}

/**
 * Latest end time among subscriptions that still cover `paidAt` (window contains paidAt).
 * Rows without endsAt are ignored.
 */
function maxEndsAtCoveringPaidAt(items, paidAtMs) {
  let best = 0;
  for (const sub of items) {
    const status = String(sub.status || "").toLowerCase();
    if (!DURATION_ELIGIBLE_STATUSES.has(status)) continue;
    const startsMs = sub.startsAt ? parseInstantMs(sub.startsAt) : 0;
    const endsMs = sub.endsAt ? parseInstantMs(sub.endsAt) : NaN;
    if (!Number.isFinite(endsMs)) continue;
    if (endsMs <= paidAtMs) continue;
    const covers =
      (!Number.isFinite(startsMs) || startsMs <= paidAtMs) &&
      endsMs > paidAtMs;
    if (covers && endsMs > best) best = endsMs;
  }
  return best > 0 ? best : null;
}

module.exports = {
  maxEndsAtCoveringPaidAt,
  parseInstantMs,
};
