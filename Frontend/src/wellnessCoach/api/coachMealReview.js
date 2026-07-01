import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

export async function coachListPendingMealLogs(token) {
  try {
    const { data: body } = await coachApi.get("/coach/meal-tracking/pending-review", {
      headers: authHeader(token),
    });
    return {
      logs: body.logs ?? [],
      total: body.total ?? 0,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachReviewMealLog(token, logId, payload) {
  try {
    const { data: body } = await coachApi.patch(
      `/coach/meal-tracking/${logId}/review`,
      payload,
      { headers: authHeader(token) }
    );
    return { mealLog: body.mealLog ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
