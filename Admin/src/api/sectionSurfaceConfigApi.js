import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

export const SECTION_SURFACE_IDS = Object.freeze([
  "banner",
  "transformation",
  "real-people",
  "voice",
  "leadership",
  "wellness-team",
  "recipes",
  "yoga",
  "client-review",
  "faq",
  "health-disorders",
  "challenges",
]);

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapSectionSurfaceConfig(row, section) {
  if (!row) return null;
  return {
    id: row.id || row._id || `${section}-config`,
    section: row.section || section,
    appOn: row.appOn !== false,
    webOn: row.webOn !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminGetSectionSurfaceConfig(token, section) {
  try {
    const { data } = await api.get(`/admin/section-surface-config/${section}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapSectionSurfaceConfig(data.data, section);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminEnsureSectionSurfaceConfig(token, section) {
  const existing = await adminGetSectionSurfaceConfig(token, section);
  if (existing) return existing;
  try {
    const { data } = await api.post(`/admin/section-surface-config/${section}`, {}, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapSectionSurfaceConfig(data.data, section);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateSectionSurfaceConfig(token, section, fields = {}) {
  const payload = {};
  if (fields.appOn !== undefined) payload.appOn = Boolean(fields.appOn);
  if (fields.webOn !== undefined) payload.webOn = Boolean(fields.webOn);
  try {
    const { data } = await api.patch(`/admin/section-surface-config/${section}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapSectionSurfaceConfig(data.data, section);
  } catch (error) {
    normalizeApiError(error);
  }
}
