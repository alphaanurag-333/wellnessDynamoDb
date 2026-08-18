import api, { normalizeApiError } from "../api.js";

export const DEFAULT_TAX_VALUE = "18";

function appConfigBase() {
  return "/admin/app-config";
}

export function parseTaxValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 100) return "";
  const rounded = Math.round(n * 100) / 100;
  return String(rounded);
}

export function toGstOn(config) {
  const type = String(config?.tax_type || "").trim().toLowerCase();
  const amount = Number(config?.tax_value);
  return type === "exclusive" && Number.isFinite(amount) && amount > 0;
}

export async function getAppGst() {
  try {
    const { data } = await api.get(appConfigBase());
    const config = data?.data || {};
    return {
      gstOn: toGstOn(config),
      taxValue: parseTaxValue(config.tax_value) || DEFAULT_TAX_VALUE,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppGst(gstOn, taxValue) {
  const rate = parseTaxValue(taxValue) || DEFAULT_TAX_VALUE;
  const payload = {
    tax_type: gstOn ? "exclusive" : "inclusive",
    tax_value: rate,
  };

  try {
    const { data } = await api.patch(appConfigBase(), payload);
    const config = data?.data || {};
    return {
      gstOn: toGstOn(config),
      taxValue: parseTaxValue(config.tax_value) || rate,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
