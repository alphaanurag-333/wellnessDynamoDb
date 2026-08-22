import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function gutResetBase(userId) {
  return `/account/heal-users/${encodeURIComponent(userId)}/gut-resets`;
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

export function mapGutResetEntry(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id: String(id),
    status: String(row.status || "completed").toLowerCase(),
    startDate: String(row.startDate || ""),
    fruitVegDate: String(row.fruitVegDate || ""),
    waterFastDate: String(row.waterFastDate || ""),
    author: savedByLabel(row),
    points: (Array.isArray(row.points) ? row.points : [])
      .map((point) => String(point || "").trim())
      .filter(Boolean),
    createdAt: row.createdAt || null,
  };
}

function mapHistoryResponse(data) {
  return (Array.isArray(data?.history) ? data.history : [])
    .map(mapGutResetEntry)
    .filter(Boolean);
}

function formatGutResetApiError(error) {
  const status = error?.response?.status;
  if (status === 404) {
    return new Error(
      "Gut reset API is unavailable. Run the local backend on port 5000 and apply migration 56-user-gut-reset.",
    );
  }
  normalizeApiError(error);
}

export async function fetchUserGutResets(userId) {
  try {
    const { data } = await api.get(gutResetBase(userId), {
      headers: authHeader(tokenOrStored()),
    });
    return mapHistoryResponse(data);
  } catch (error) {
    formatGutResetApiError(error);
  }
}

export async function saveUserGutReset(userId, { startDate, fruitVegDate, waterFastDate, points } = {}) {
  try {
    const { data } = await api.post(
      gutResetBase(userId),
      {
        startDate,
        fruitVegDate,
        waterFastDate,
        points: (Array.isArray(points) ? points : [])
          .map((point) => String(point || "").trim())
          .filter(Boolean),
      },
      { headers: authHeader(tokenOrStored()) },
    );
    return mapHistoryResponse(data);
  } catch (error) {
    formatGutResetApiError(error);
  }
}
