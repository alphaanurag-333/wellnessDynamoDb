import api, { authHeader, normalizeApiError } from "../../api.js";

function usersBase() {
  return "/admin/users";
}

export async function adminGetUserWaterTracking(token, userId, { days = 30, from, to } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await api.get(`${usersBase()}/${userId}/water-tracking${suffix}`, {
      headers: authHeader(token),
    });
    return {
      user: body.user ?? null,
      data: body.data ?? { settings: {}, history: [], range: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
