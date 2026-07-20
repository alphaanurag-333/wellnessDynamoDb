// import { miscUploadSrc } from "../api/adminMisc.js";
import { mediaUrl } from "../media.js";

const DEFAULT_APP_NAME = "IR Wellness";

/** Raw app config document from the API (public or admin). */
export function selectAppConfigData(state) {
  return state.appConfig?.data ?? null;
}

export function selectAppConfigLoading(state) {
  return !!state.appConfig?.loading;
}

/**
 * Prefer admin logo in the panel; fall back to storefront user logo.
 */
export function selectPanelLogoUrl(state) {
  const d = selectAppConfigData(state);
  if (!d) return "";
  const path = d.admin_logo || d.user_logo || "";
  return mediaUrl(path);
}

export function selectAppDisplayName(state) {
  const name = selectAppConfigData(state)?.app_name?.trim();
  return name || DEFAULT_APP_NAME;
}

export function selectLoginBrandLogoUrl(state) {
  const d = selectAppConfigData(state);
  if (!d) return "";
  const path = d.user_logo || d.admin_logo || "";
  return mediaUrl(path);
}

export function selectAppFooterText(state) {
  const text = selectAppConfigData(state)?.app_footer_text;
  return typeof text === "string" ? text.trim() : "";
}

export function selectTaxType(state) {
  const type = selectAppConfigData(state)?.tax_type;
  return typeof type === "string" ? type.trim() : "";
}

export function selectTaxValue(state) {
  const value = selectAppConfigData(state)?.tax_value;
  return value != null ? String(value).trim() : "";
}

export function selectConsultancyAmount(state) {
  const amount = selectAppConfigData(state)?.consultancy_amount;
  return amount != null ? String(amount).trim() : "";
}

export function selectMultilang(state) {
  const raw = selectAppConfigData(state)?.multilang;
  return raw === true || String(raw || "").toLowerCase() === "true";
}
