import api, { normalizeApiError } from "../api.js";

function appConfigBase() {
  return "/admin/app-config";
}

/** Missing field = Active, matching the public app-config default. */
function toEnabled(value) {
  if (value === undefined || value === null || value === "") return true;
  return value === true || String(value).trim().toLowerCase() === "true";
}

export function mapCitation(config = {}) {
  return {
    enabled: toEnabled(config.citation_enabled),
  };
}

export async function getCitation() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapCitation(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCitation({ enabled }) {
  try {
    const { data } = await api.patch(appConfigBase(), {
      citation_enabled: Boolean(enabled),
    });
    return mapCitation(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
