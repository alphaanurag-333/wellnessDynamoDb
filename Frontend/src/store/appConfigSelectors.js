import { mediaUrl } from "../media.js";

const DEFAULT_APP_NAME = "India Redefining Wellness";

export function selectAppConfigData(state) {
  return state.appConfig?.data ?? null;
}

export function selectAppConfigLoading(state) {
  return !!state.appConfig?.loading;
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

export function selectApkLogoLightUrl(state) {
  const data = selectAppConfigData(state);
  const path = data?.apk_logo_light || data?.apk_logo || "";
  return mediaUrl(path);
}

export function selectApkLogoDarkUrl(state) {
  const path = selectAppConfigData(state)?.apk_logo_dark || "";
  return mediaUrl(path);
}

export function selectAppFooterText(state) {
  const text = selectAppConfigData(state)?.app_footer_text;
  return typeof text === "string" ? text.trim() : "";
}

export function selectConsultancyAmount(state) {
  const amount = selectAppConfigData(state)?.consultancy_amount;
  return amount != null ? String(amount).trim() : "";
}
