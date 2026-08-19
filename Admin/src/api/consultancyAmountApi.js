import api, { normalizeApiError } from "../api.js";

export const CONSULTANCY_FIELD_MAX = 10;
export const TAX_TYPE_OPTIONS = [
  { value: "inclusive", label: "Inclusive (tax included in price)" },
  { value: "exclusive", label: "Exclusive (tax added at checkout)" },
];

function appConfigBase() {
  return "/admin/app-config";
}

export function normalizeTaxType(value) {
  const next = String(value || "").trim().toLowerCase();
  return next === "inclusive" || next === "exclusive" ? next : "";
}

export function clipField(value, max = CONSULTANCY_FIELD_MAX) {
  return String(value ?? "").slice(0, max);
}

export function parseMoneyField(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) return "";
  return String(Math.round((n + Number.EPSILON) * 100) / 100);
}

export function parseTaxPercent(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100) return "";
  return String(Math.round((n + Number.EPSILON) * 100) / 100);
}

export function mapConsultancyAmount(config = {}) {
  return {
    consultancyAmount: clipField(config.consultancy_amount ?? ""),
    taxType: normalizeTaxType(config.tax_type) || "inclusive",
    taxValue: clipField(config.tax_value ?? ""),
    referralDiscount: clipField(config.referral_discount ?? ""),
  };
}

export async function getConsultancyAmount() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapConsultancyAmount(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveConsultancyAmount(fields) {
  const payload = {
    consultancy_amount: String(fields?.consultancyAmount || "").trim(),
    tax_type: normalizeTaxType(fields?.taxType),
    tax_value: String(fields?.taxValue || "").trim(),
    referral_discount: String(fields?.referralDiscount || "").trim(),
  };
  if (!payload.tax_type) {
    const err = new Error("Tax type is required");
    err.status = 400;
    throw err;
  }
  try {
    const { data } = await api.patch(appConfigBase(), payload);
    return mapConsultancyAmount(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
