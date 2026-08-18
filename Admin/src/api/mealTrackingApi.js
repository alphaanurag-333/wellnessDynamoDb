import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function healUserPath(userId, suffix = "") {
  return `/account/heal-users/${encodeURIComponent(userId)}${suffix}`;
}

export async function fetchUserMealTracking(userId, { date, days = 1 } = {}) {
  const q = new URLSearchParams();
  if (date) q.set("date", date);
  q.set("days", String(days));
  try {
    const { data } = await api.get(`${healUserPath(userId, "/meal-tracking")}?${q}`, {
      headers: authHeader(),
    });
    return {
      logs: Array.isArray(data.logs) ? data.logs : [],
      macroSummary: Array.isArray(data.macroSummary) ? data.macroSummary : [],
      range: data.range || null,
      mealTrackingMode: data.mealTrackingMode === "detailed_macro" ? "detailed_macro" : "macro",
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateUserMealLog(userId, logId, payload) {
  try {
    const { data } = await api.put(
      healUserPath(userId, `/meal-tracking/${encodeURIComponent(logId)}`),
      payload,
      { headers: authHeader() },
    );
    return data.mealLog;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function reviewUserMealLog(logId, payload) {
  try {
    const { data } = await api.patch(
      `/account/meal-tracking/${encodeURIComponent(logId)}/review`,
      payload,
      { headers: authHeader() },
    );
    return data.mealLog;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateUserMealTrackingMode(userId, mealTrackingMode) {
  try {
    const { data } = await api.patch(
      healUserPath(userId, "/meal-tracking-mode"),
      { mealTrackingMode },
      { headers: authHeader() },
    );
    return data.mealTrackingMode === "detailed_macro" ? "detailed_macro" : "macro";
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserWaterTracking(userId, { from, to, days } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (days) q.set("days", String(days));
  try {
    const { data } = await api.get(`${healUserPath(userId, "/water-tracking")}?${q}`, {
      headers: authHeader(),
    });
    return data.data || { settings: null, history: [], range: null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserDietPlanAssignments(userId) {
  try {
    const { data } = await api.get(healUserPath(userId, "/diet-plan-assignments"), {
      headers: authHeader(),
    });
    return {
      assignments: Array.isArray(data.assignments) ? data.assignments : [],
      recommended: data.recommended || null,
      history: Array.isArray(data.history) ? data.history : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
