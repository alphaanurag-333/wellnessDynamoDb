import api, { normalizeApiError } from "../api.js";

function appConfigBase() {
  return "/admin/app-config";
}

export function mapWebLocations(config = {}) {
  const rows = Array.isArray(config.web_locations) ? config.web_locations : [];
  const mapped = rows
    .map((row) => ({
      id: String(row.id || "").trim(),
      name: String(row.name || "").trim(),
      address: String(row.address || "").trim(),
      live: row.live !== false,
    }))
    .filter((row) => row.id && row.name && row.address);
  if (mapped.length) return mapped;
  const address = String(config.address || "").trim();
  if (address) {
    return [{ id: "loc-primary", name: "Registered office", address, live: true }];
  }
  return [];
}

export async function getWebLocations() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapWebLocations(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveWebLocations(locations) {
  const payload = (Array.isArray(locations) ? locations : [])
    .map((row) => ({
      id: String(row.id || "").trim(),
      name: String(row.name || "").trim(),
      address: String(row.address || "").trim(),
      live: row.live !== false,
    }))
    .filter((row) => row.id && row.name && row.address);

  const firstLive = payload.find((row) => row.live);
  try {
    const { data } = await api.patch(appConfigBase(), {
      web_locations: payload,
      ...(firstLive ? { address: firstLive.address } : {}),
    });
    return mapWebLocations(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}
