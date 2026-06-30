import api, { authHeader, normalizeApiError } from "../../api.js";

function mealTrackingBase(userId) {
  return `/admin/meal-tracking/users/${userId}/meal-tracking`;
}

export async function adminGetUserMealTracking(token, userId, { date, days } = {}) {
  try {
    const params = {};
    if (date) params.date = date;
    if (days) params.days = days;

    const { data: body } = await api.get(mealTrackingBase(userId), {
      headers: authHeader(token),
      params,
    });
    return {
      user: body.user ?? null,
      logs: body.logs ?? [],
      macroSummary: body.macroSummary ?? [],
      range: body.range ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteMealLog(token, userId, logId) {
  try {
    await api.delete(`/admin/meal-tracking/users/${userId}/meal-tracking/${logId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
