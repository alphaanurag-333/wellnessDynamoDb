import api, { normalizeApiError } from "../api.js";

const NAMES_MAX = 120;
const DEFAULT_NAMES = "GDPR, HIPAA";

function appConfigBase() {
  return "/admin/app-config";
}

function toEnabled(value) {
  return value === true || String(value || "").toLowerCase() === "true";
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
