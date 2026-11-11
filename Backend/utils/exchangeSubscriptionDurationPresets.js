/**
 * Fixed presets for Energy Exchange bundled app subscription (coach-triggered program checkout).
 * Admin UI mirrors these ids in Admin/src/data/exchangeSubscriptionDurationPresets.js
 */
const EXCHANGE_SUBSCRIPTION_DURATION_PRESETS = [
  { id: "30d", unit: "days", amount: 30, label: "30 days (from payment)" },
  { id: "90d", unit: "days", amount: 90, label: "90 days (from payment)" },
  { id: "6m", unit: "months", amount: 6, label: "6 months (from payment)" },
  { id: "1y", unit: "years", amount: 1, label: "1 year (from payment)" },
  { id: "2y", unit: "years", amount: 2, label: "2 years (from payment)" },
];

const PRESET_BY_ID = new Map(
  EXCHANGE_SUBSCRIPTION_DURATION_PRESETS.map((p) => [p.id, p])
);

function getBundledSubscriptionPresetById(id) {
  if (id == null) return null;
  return PRESET_BY_ID.get(String(id).trim()) || null;
}

const BUNDLED_DURATION_UNITS = new Set(["days", "months", "years"]);
const BUNDLED_DURATION_AMOUNT_MAX = 9999;

function normalizeBundledDurationUnit(raw) {
  const u = String(raw || "").trim().toLowerCase();
  if (u === "day") return "days";
  if (u === "month") return "months";
  if (u === "year") return "years";
  return BUNDLED_DURATION_UNITS.has(u) ? u : null;
}

function parseBundledDurationAmount(raw) {
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > BUNDLED_DURATION_AMOUNT_MAX) {
    return null;
  }
  return n;
}

function formatBundledDurationShortLabel(amount, unit) {
  const n = Number(amount) || 0;
  const u = normalizeBundledDurationUnit(unit);
  if (!u || n < 1) return "";
  if (u === "days") return n === 1 ? "1 day" : `${n} days`;
  if (u === "months") return n === 1 ? "1 month" : `${n} months`;
  return n === 1 ? "1 year" : `${n} years`;
}

module.exports = {
  EXCHANGE_SUBSCRIPTION_DURATION_PRESETS,
  getBundledSubscriptionPresetById,
  normalizeBundledDurationUnit,
  parseBundledDurationAmount,
  formatBundledDurationShortLabel,
  BUNDLED_DURATION_UNITS,
};
