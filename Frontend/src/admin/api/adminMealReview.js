import api, { authHeader, normalizeApiError } from "../../api.js";

export async function adminListPendingMealLogs(token) {
  try {
    const { data } = await api.get("/admin/meal-tracking/pending-review", {
      headers: authHeader(token),
    });
    return { logs: Array.isArray(data.logs) ? data.logs : [] };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReviewMealLog(token, logId, payload) {
  try {
    const { data: body } = await api.patch(
      `/admin/meal-tracking/${encodeURIComponent(logId)}/review`,
      payload,
      { headers: authHeader(token) }
    );
    return { mealLog: body.mealLog ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
