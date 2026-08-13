export const NUTRITION_BANK = [
  { id: "nb-vitd", name: "Vitamin D Plus", pack: "60 caps", price: 1200 },
  { id: "nb-whey", name: "Whey Protein Isolate", pack: "1 kg", price: 2400 },
  { id: "nb-omega", name: "Omega-3 Fish Oil", pack: "120 tabs", price: 1200 },
  { id: "nb-mag", name: "Magnesium Glycinate", pack: "90 caps", price: 900 },
];

export function formatBottlePrice(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "—";
  return amount.toLocaleString("en-IN");
}

export function parseBottlePrice(value) {
  const digits = String(value).replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}
