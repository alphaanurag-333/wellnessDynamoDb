import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import {
  formatProtocolSavedAt,
  historyDeltaLabel,
  pointCountLabel,
} from "../data/protocolSettingsData.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function protocolBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/protocol-settings`;
}

function savedByLabel(row) {
  const role = String(row?.savedByRole || "").toLowerCase();
  const name = String(row?.savedByName || "").trim();
  if (role === "admin") return "Admin desk";
  if (name) return name;
  if (role === "wellness_coach") return "Wellness coach";
  if (role === "assistant_wellness_coach") return "Assistant coach";
  return "Staff";
}

export function mapProtocolVersion(row, previousCount = 0) {
  if (!row) return null;
  const id = row.id || row._id;
  const points = (Array.isArray(row.points) ? row.points : [])
    .map((point) => String(point || "").trim())
    .filter(Boolean);
  const version = Number(row.version) || 0;
  if (!id && !version) return null;
  const createdAt = row.createdAt || "";
  const savedDate = createdAt ? new Date(createdAt) : null;
  return {
    id: String(id || `v${version}`),
    version,
    points,
    savedAt: savedDate && !Number.isNaN(savedDate.getTime()) ? formatProtocolSavedAt(savedDate) : "",
    savedByLabel: savedByLabel(row),
    deltaLabel: historyDeltaLabel(points.length, previousCount),
    createdAt,
  };
}

function mapHistory(rows) {
  const list = Array.isArray(rows) ? rows : [];
  return list
    .map((row, index) => {
      const previousCount = list[index + 1]?.points?.length ?? 0;
      return mapProtocolVersion(row, previousCount);
    })
    .filter(Boolean);
}

export async function fetchUserProtocolSettings(userId) {
  try {
    const { data } = await api.get(protocolBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    const history = mapHistory(data.history);
    const current = mapProtocolVersion(
      data.current,
      history[1]?.points.length ?? 0
    ) || history[0] || null;
    return { current, history };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function saveUserProtocolSettings(userId, points) {
  try {
    const { data } = await api.post(
      protocolBase(userId),
      { points: (Array.isArray(points) ? points : []).map((point) => String(point || "").trim()).filter(Boolean) },
      { headers: authHeader(tokenOrStored()) },
    );
    const history = mapHistory(data.history);
    const current = mapProtocolVersion(
      data.current,
      history[1]?.points.length ?? 0
    ) || history[0] || null;
    return { current, history };
  } catch (error) {
    normalizeApiError(error);
  }
}

export { pointCountLabel };
