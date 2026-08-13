export const EXCHANGE_PROGRAMS = [
  { id: "fat-loss", name: "Fat Loss", price: 24999 },
  { id: "diabetes", name: "Diabetes Reversal", price: 29999 },
  { id: "thyroid", name: "Thyroid Care", price: 22999 },
  { id: "pcod", name: "PCOD / PCOS", price: 26999 },
  { id: "app-year", name: "App subscription · yearly", price: 4999 },
];

export const EXCHANGE_DISCOUNTS = [
  { id: "d10", pct: 10, label: "standard" },
  { id: "d12", pct: 12, label: "wellness plan" },
  { id: "d15", pct: 15, label: "festive" },
  { id: "d20", pct: 20, label: "annual plan" },
  { id: "d25", pct: 25, label: "corporate" },
];

export const EXCHANGE_VALIDITY = [
  { id: "v24", label: "24 hours" },
  { id: "v48", label: "48 hours" },
  { id: "v3d", label: "3 days" },
  { id: "v7d", label: "7 days" },
  { id: "vnone", label: "No expiry" },
];

export const PAYMENT_HISTORY = [
  {
    id: "pay-1",
    program: "Diabetes Reversal",
    status: "awaiting",
    date: "03 Aug 2026",
    detail: "Triggered to app · Invoice on payment",
    amount: 25499,
    listed: 29999,
    discountPct: 15,
  },
  {
    id: "pay-2",
    program: "Fat Loss",
    status: "paid",
    date: "06 Jul 2026",
    detail: "UPI · HDFC · IRW-INV-2026-0731",
    amount: 21249,
    listed: 24999,
    discountPct: 15,
  },
  {
    id: "pay-3",
    program: "App subscription · yearly",
    status: "paid",
    date: "12 Apr 2026",
    detail: "Card · ICICI · IRW-INV-2026-0418",
    amount: 3999,
    listed: 4999,
    discountPct: 20,
  },
  {
    id: "pay-4",
    program: "Thyroid Care",
    status: "paid",
    date: "02 Jan 2026",
    detail: "Net banking · IRW-INV-2026-0067",
    amount: 20239,
    listed: 22999,
    discountPct: 12,
  },
];

export function formatRupee(value) {
  return `Rs. ${Math.round(value).toLocaleString("en-IN")}`;
}

export function discountedPrice(listed, discountPct) {
  return Math.round(listed * (1 - discountPct / 100));
}

export function programLabel(program) {
  return `${program.name} · ${formatRupee(program.price)}`;
}

export function discountLabel(discount) {
  return `${discount.pct}% · ${discount.label}`;
}

export function paymentSummary(history) {
  const paid = history.filter((row) => row.status === "paid");
  const awaiting = history.filter((row) => row.status === "awaiting");
  const received = paid.reduce((sum, row) => sum + row.amount, 0);
  return {
    paidCount: paid.length,
    awaitingCount: awaiting.length,
    received,
    label: `${paid.length} paid · ${awaiting.length} awaiting · ${formatRupee(received)} received`,
  };
}
