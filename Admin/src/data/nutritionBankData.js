export const NUTRITION_BANK = [];

export const NUTRITION_BANK_PAGE_SIZE = 20;

export const NUTRITION_BANK_UNITS = ["Caps", "Tablets", "Softgels", "Sachets", "ml", "g", "mg", "Drops"];

export const SUPPLEMENT_POOL_UNITS = ["Caps", "Tabs", "Tablets", "Softgels", "Sachets", "Kg", "g", "mg", "ml", "Drops"];

export function emptyNutritionDraft() {
  return {
    name: "",
    description: "",
    packSize: "",
    unit: "Caps",
    price: "",
  };
}

export function formatBottlePrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return amount.toLocaleString("en-IN");
}

export function parseBottlePrice(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function parsePackSize(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

export function formatPack(packSize, unit) {
  const size = Number(packSize);
  const label = String(unit || "").trim();
  if (Number.isFinite(size) && size > 0 && label) return `${size} ${label}`;
  if (label) return label;
  if (Number.isFinite(size) && size > 0) return String(size);
  return "";
}

export function unitOptionsFor(unit, units = NUTRITION_BANK_UNITS) {
  const current = String(unit || "").trim();
  if (current && !units.includes(current)) {
    return [current, ...units];
  }
  return units;
}
