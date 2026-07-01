import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

export async function assistantListPendingMealLogs(token) {
  try {
    const { data: body } = await assistantApi.get("/assistant/meal-tracking/pending-review", {
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

export async function assistantReviewMealLog(token, logId, payload) {
  try {
    const { data: body } = await assistantApi.patch(
      `/assistant/meal-tracking/${logId}/review`,
      payload,
      { headers: authHeader(token) }
    );
    return { mealLog: body.mealLog ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
