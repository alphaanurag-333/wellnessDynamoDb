import api, { normalizeApiError } from "../api.js";

function appConfigBase() {
  return "/admin/app-config";
}

function toHindiOn(value) {
  return value === true || String(value || "").toLowerCase() === "true";
}

export async function getAppLanguage() {
  try {
    const { data } = await api.get(appConfigBase());
    return toHindiOn(data?.data?.multilang);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppLanguage(hindiOn) {
  try {
    const { data } = await api.patch(appConfigBase(), {
      multilang: Boolean(hindiOn),
    });
    return toHindiOn(data?.data?.multilang);
  } catch (error) {
    normalizeApiError(error);
  }
}
