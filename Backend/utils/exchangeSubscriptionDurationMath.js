/**
 * Add calendar duration to an ISO instant (UTC). Used for bundled EE subscriptions.
 */
function addDurationFromIso(startsAtIso, unit, amount) {
  const start = new Date(startsAtIso);
  if (Number.isNaN(start.getTime())) {
    throw new Error("Invalid startsAt for duration add");
  }
  const u = String(unit || "").toLowerCase();
  const n = Math.max(0, Number(amount) || 0);

  if (u === "days") {
    const d = new Date(start.getTime());
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString();
  }

  if (u === "months") {
    const d = new Date(start.getTime());
    d.setUTCMonth(d.getUTCMonth() + n);
    return d.toISOString();
  }

  if (u === "years") {
    const d = new Date(start.getTime());
    d.setUTCFullYear(d.getUTCFullYear() + n);
    return d.toISOString();
  }

  throw new Error(`Unsupported duration unit: ${unit}`);
}

module.exports = {
  addDurationFromIso,
};
