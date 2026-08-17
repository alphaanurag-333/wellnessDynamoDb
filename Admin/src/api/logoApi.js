import api, { normalizeApiError } from "../api.js";
import { mapLogoSlotsFromConfig } from "../data/logoConfigData.js";

function appConfigBase() {
  return "/admin/app-config";
}

export async function getAppLogos() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapLogoSlotsFromConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppLogo(field, file) {
  const fd = new FormData();
  fd.append(field, file);
  try {
    const { data } = await api.patch(appConfigBase(), fd);
    return mapLogoSlotsFromConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
