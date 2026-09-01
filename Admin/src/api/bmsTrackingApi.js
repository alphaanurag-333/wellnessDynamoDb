import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function healUserPath(userId, suffix = "") {
  return `/account/heal-users/${encodeURIComponent(userId)}${suffix}`;
}

function emptyTracking() {
  return { settings: null, today: null, history: [], range: null };
}

async function fetchTracking(userId, suffix, { from, to, days } = {}) {
  const q = new URLSearchParams();
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (days) q.set("days", String(days));
  try {
    const { data } = await api.get(`${healUserPath(userId, suffix)}?${q}`, {
      headers: authHeader(),
    });
    return data.data || emptyTracking();
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserStepsTracking(userId, range) {
  return fetchTracking(userId, "/steps-tracking", range);
}

export async function updateUserStepsGoal(userId, goalSteps) {
  try {
    const { data } = await api.patch(
      healUserPath(userId, "/steps-tracking/goal"),
      { goalSteps: Number(goalSteps) },
      { headers: authHeader() },
    );
    return data.data || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function unlockUserStepsGoal(userId) {
  try {
    const { data } = await api.patch(
      healUserPath(userId, "/steps-tracking/goal/unlock"),
      {},
      { headers: authHeader() },
    );
    return data.data || null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function fetchUserHeartRateTracking(userId, range) {
  return fetchTracking(userId, "/heart-rate-tracking", range);
}

export async function fetchUserSleepTracking(userId, range) {
  return fetchTracking(userId, "/sleep-tracking", range);
}

export async function updateUserBmsTracking(userId, payload) {
  try {
    const { data } = await api.patch(
      healUserPath(userId, "/bms-tracking"),
      payload,
      { headers: authHeader() },
    );
    return {
      heartRateEnabled: data.heartRateEnabled !== false,
      sleepTrackingEnabled: data.sleepTrackingEnabled !== false,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
