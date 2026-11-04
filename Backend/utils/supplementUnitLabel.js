const SUPPLEMENT_UNIT_SINGULAR = {
  Caps: "Cap",
  Tablets: "Tablet",
  Tabs: "Tab",
  Softgels: "Softgel",
  Sachets: "Sachet",
  Drops: "Drop",
};

const INVARIANT_SUPPLEMENT_UNITS = new Set(["ml", "g", "mg", "Kg"]);

function supplementUnitForCount(count, unit) {
  const raw = String(unit || "").trim();
  if (!raw) return "";
  const n = Number(count);
  if (!Number.isFinite(n)) return raw;
  if (INVARIANT_SUPPLEMENT_UNITS.has(raw)) return raw;
  if (Math.abs(n) === 1) {
    return SUPPLEMENT_UNIT_SINGULAR[raw] || raw;
  }
  return raw;
}

function formatSupplementQuantityLabel(count, unit) {
  const qty = Number(count);
  const displayQty = Number.isFinite(qty) ? qty : count;
  const unitWord = supplementUnitForCount(displayQty, unit);
  return unitWord ? `${displayQty} ${unitWord}`.trim() : String(displayQty);
}

module.exports = {
  supplementUnitForCount,
  formatSupplementQuantityLabel,
};
