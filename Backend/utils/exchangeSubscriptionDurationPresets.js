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

module.exports = {
  EXCHANGE_SUBSCRIPTION_DURATION_PRESETS,
  getBundledSubscriptionPresetById,
};
