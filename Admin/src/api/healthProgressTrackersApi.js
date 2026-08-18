import api, { normalizeApiError } from "../api.js";
import { DEFAULT_HEALTH_PROGRESS_TRACKERS } from "../data/healthProgressData.js";

function appConfigBase() {
  return "/admin/app-config";
}

function slugifyTrackerId(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function mapHealthProgressTrackers(config = {}) {
  const rows = Array.isArray(config.health_progress_trackers)
    ? config.health_progress_trackers
    : DEFAULT_HEALTH_PROGRESS_TRACKERS;
  return rows.map((row) => ({
    id: String(row.id || "").trim(),
    name: String(row.name || row.category || "").trim(),
    category: String(row.category || row.name || "").trim(),
    color: String(row.color || "#5e6ad2").trim() || "#5e6ad2",
    enabled: row.enabled !== false,
    builtin: row.builtin !== false,
    featureKey: row.featureKey ? String(row.featureKey) : undefined,
  })).filter((row) => row.id);
}

export async function getHealthProgressTrackers() {
  try {
    const { data } = await api.get(appConfigBase());
    return mapHealthProgressTrackers(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveHealthProgressTrackers(trackers) {
  const payload = (Array.isArray(trackers) ? trackers : []).map((row) => ({
    id: slugifyTrackerId(row.id || row.name || row.category),
    name: String(row.name || row.category || "").trim(),
    category: String(row.category || row.name || "").trim(),
    color: String(row.color || "#5e6ad2").trim() || "#5e6ad2",
    enabled: row.enabled !== false,
    builtin: Boolean(row.builtin),
    ...(row.featureKey ? { featureKey: String(row.featureKey) } : {}),
  })).filter((row) => row.id && row.name);

  try {
    const { data } = await api.patch(appConfigBase(), {
      health_progress_trackers: payload,
    });
    return mapHealthProgressTrackers(data?.data || {});
  } catch (error) {
    normalizeApiError(error);
  }
}

export function createCustomTracker(name, existing = []) {
  const label = String(name || "").trim();
  const base = slugifyTrackerId(label) || `tracker-${Date.now()}`;
  let id = base;
  let n = 2;
  const used = new Set(existing.map((row) => String(row.id)));
  while (used.has(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return {
    id,
    name: label,
    category: label,
    color: "#5e6ad2",
    enabled: true,
    builtin: false,
  };
}
