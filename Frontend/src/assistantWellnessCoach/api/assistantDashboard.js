import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

export async function assistantGetDashboardStatistics(token) {
  try {
    const { data } = await assistantApi.get("/assistant/dashboard/statistics", {
      headers: authHeader(token),
    });
    return data?.statistics ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
