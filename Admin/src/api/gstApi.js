import api, { normalizeApiError } from "../api.js";

const DEFAULT_TAX_VALUE = "18";

function appConfigBase() {
  return "/admin/app-config";
}

function parseTaxValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? String(n) : "";
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
  const payload = gstOn
    ? {
        tax_type: "exclusive",
        tax_value: parseTaxValue(taxValue) || DEFAULT_TAX_VALUE,
      }
    : { tax_type: "inclusive" };

  try {
    const { data } = await api.patch(appConfigBase(), payload);
    const config = data?.data || {};
    return {
      gstOn: toGstOn(config),
      taxValue: parseTaxValue(config.tax_value) || taxValue || DEFAULT_TAX_VALUE,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
