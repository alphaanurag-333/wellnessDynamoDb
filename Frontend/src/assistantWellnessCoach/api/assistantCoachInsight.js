import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function base(userId) {
  return `/assistant/heal-users/${userId}/coach-insight`;
}

export async function assistantGetUserCoachInsight(token, userId) {
  try {
    const { data: body } = await assistantApi.get(base(userId), {
      headers: authHeader(token),
    });
    return body.coachInsight ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpsertUserCoachInsight(token, userId, message) {
  try {
    const { data: body } = await assistantApi.put(
      base(userId),
      { message },
      { headers: authHeader(token) }
    );
    return body.coachInsight ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
