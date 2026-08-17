import api, { normalizeApiError } from "../api.js";

function appConfigBase() {
  return "/admin/app-config";
}

export function normalizeFooterText(value) {
  return String(value ?? "").trim().slice(0, 100);
}

export async function getAppFooterText() {
  try {
    const { data } = await api.get(appConfigBase());
    return normalizeFooterText(data?.data?.app_footer_text);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppFooterText(text) {
  try {
    const { data } = await api.patch(appConfigBase(), {
      app_footer_text: normalizeFooterText(text),
    });
    return normalizeFooterText(data?.data?.app_footer_text);
  } catch (error) {
    normalizeApiError(error);
  }
}
