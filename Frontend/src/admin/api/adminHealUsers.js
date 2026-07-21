import api, { authHeader, normalizeApiError } from "../../api.js";

function usersBase() {
  return "/admin/users";
}

export async function adminGetUserSleepTracking(token, userId, { days = 7, date } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (date) q.set("date", date);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await api.get(
      `${usersBase()}/${userId}/sleep-tracking${suffix}`,
      { headers: authHeader(token) }
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { today: {}, history: [], range: {}, connections: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetUserHeartRateTracking(token, userId, { days = 7, date } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (date) q.set("date", date);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await api.get(
      `${usersBase()}/${userId}/heart-rate-tracking${suffix}`,
      { headers: authHeader(token) }
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { today: {}, history: [], range: {}, connections: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
