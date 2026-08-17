import api, { normalizeApiError } from "../api.js";
import { mapSocialLinksFromConfig, mapSocialLinksToConfig } from "../data/socialLinksConfigData.js";

function appConfigBase() {
  return "/admin/app-config";
}

export async function getAppSocialLinks() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapSocialLinksFromConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveAppSocialLinks(links) {
  try {
    const { data } = await api.patch(appConfigBase(), mapSocialLinksToConfig(links));
    return mapSocialLinksFromConfig(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
