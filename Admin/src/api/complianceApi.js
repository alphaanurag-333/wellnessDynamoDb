import api, { normalizeApiError } from "../api.js";

const NAMES_MAX = 120;
const DEFAULT_NAMES = "GDPR, HIPAA";

function appConfigBase() {
  return "/admin/app-config";
}

/**
 * Match public app-config + AppConfig create default: missing field = shown.
 * (Previously `undefined` mapped to false here while the app still showed the drawer line.)
 */
function toEnabled(value) {
  if (value === undefined || value === null || value === "") return true;
  return value === true || String(value).trim().toLowerCase() === "true";
}

export function mapCompliance(config = {}) {
  return {
    enabled: toEnabled(config.compliance_enabled),
    names: String(config.compliance_names ?? "").trim() || DEFAULT_NAMES,
  };
}

export async function getCompliance() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapCompliance(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveCompliance({ enabled, names }) {
  try {
    const { data } = await api.patch(appConfigBase(), {
      compliance_enabled: Boolean(enabled),
      compliance_names: String(names ?? "").trim().slice(0, NAMES_MAX),
    });
    return mapCompliance(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export { NAMES_MAX, DEFAULT_NAMES };
