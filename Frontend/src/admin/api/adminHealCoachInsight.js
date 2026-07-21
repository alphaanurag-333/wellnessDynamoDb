import api, { authHeader, normalizeApiError } from "../../api.js";

function base(userId) {
  return `/admin/heal-users/${userId}/coach-insight`;
}

export async function adminGetUserCoachInsight(token, userId) {
  try {
    const { data: body } = await api.get(base(userId), {
      headers: authHeader(token),
    });
    return body.coachInsight ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpsertUserCoachInsight(token, userId, message) {
  try {
    const { data: body } = await api.put(
      base(userId),
      { message },
      { headers: authHeader(token) }
    );
    return body.coachInsight ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
