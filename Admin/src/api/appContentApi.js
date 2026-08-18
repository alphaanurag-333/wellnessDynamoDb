import api, { normalizeApiError } from "../api.js";

function appConfigBase() {
  return "/admin/app-config";
}

function mapAppContent(config = {}) {
  return {
    appName: String(config.app_name || "").trim(),
    appEmail: String(config.app_email || "").trim(),
    appMobile: String(config.app_mobile || "").trim(),
    address: String(config.address || ""),
  };
}

export async function getAppContent() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapAppContent(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppContent(fields) {
  try {
    const payload = {
      app_name: String(fields?.appName || "").trim(),
      app_email: String(fields?.appEmail || "").trim(),
      app_mobile: String(fields?.appMobile || "").trim(),
      address: String(fields?.address || ""),
    };
    const { data } = await api.patch(appConfigBase(), payload);
    return mapAppContent(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
