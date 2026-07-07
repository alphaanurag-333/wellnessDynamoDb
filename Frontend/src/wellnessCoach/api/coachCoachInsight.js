import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function base(userId) {
  return `/coach/heal-users/${userId}/coach-insight`;
}

export async function coachGetUserCoachInsight(token, userId) {
  try {
    const { data: body } = await coachApi.get(base(userId), {
      headers: authHeader(token),
    });
    return body.coachInsight ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpsertUserCoachInsight(token, userId, message) {
  try {
    const { data: body } = await coachApi.put(
      base(userId),
      { message },
      { headers: authHeader(token) }
    );
    return body.coachInsight ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
