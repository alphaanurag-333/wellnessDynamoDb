import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase() {
  return "/coach/heal-users";
}

export async function coachGetUserSleepTracking(token, userId, { days = 7, date } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (date) q.set("date", date);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await coachApi.get(
      `${healUsersBase()}/${userId}/sleep-tracking${suffix}`,
      { headers: authHeader(token) },
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { today: {}, history: [], range: {}, connections: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
