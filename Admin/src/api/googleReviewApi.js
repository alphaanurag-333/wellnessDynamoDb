import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/account/app-config";

export const GOOGLE_REVIEW_STAT_FIELDS = [
  { id: "gr-rating", key: "average_rating", label: "Google rating", icon: "★", tone: "gold" },
  { id: "gr-reviews", key: "google_reviews", label: "Google reviews", icon: "✎", tone: "blue" },
  { id: "gr-clients", key: "happy_clients", label: "Happy clients", icon: "👥", tone: "teal" },
  { id: "gr-success", key: "success_rate", label: "Success rate (%)", icon: "✓", tone: "green" },
  { id: "gr-improved", key: "improved_user", label: "Lives improved", icon: "✦", tone: "purple" },
  { id: "gr-facebook", key: "facebook_followers", label: "Facebook followers", icon: "📘", tone: "pink" },
];

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function statsFromAppConfig(config) {
  return GOOGLE_REVIEW_STAT_FIELDS.map((def) => {
    const value = String(config?.[def.key] ?? "").trim();
    return {
      ...def,
      value,
      shown: Boolean(value),
      surface: "both",
    };
  });
}

export function patchFromStats(stats) {
  const patch = {};
  for (const row of stats) {
    const def = GOOGLE_REVIEW_STAT_FIELDS.find((entry) => entry.id === row.id);
    if (def) patch[def.key] = String(row.value ?? "").trim();
  }
  return patch;
}

export async function adminGetGoogleReviewStats(token) {
  try {
    const { data } = await api.get(BASE, {
      headers: authHeader(tokenOrStored(token)),
    });
    return statsFromAppConfig(data?.data ?? {});
  } catch (error) {
    normalizeApiError(error);
  }
  return statsFromAppConfig({});
}

export async function adminSaveGoogleReviewStats(token, stats) {
  try {
    const { data } = await api.patch(BASE, patchFromStats(stats), {
      headers: authHeader(tokenOrStored(token)),
    });
    return statsFromAppConfig(data?.data);
  } catch (error) {
    normalizeApiError(error);
  }
}
