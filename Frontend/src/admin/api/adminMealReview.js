import api, { authHeader, normalizeApiError } from "../../api.js";

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
