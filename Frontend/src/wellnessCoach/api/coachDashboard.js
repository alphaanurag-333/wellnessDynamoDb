import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

export async function coachGetDashboardStatistics(token) {
  try {
    const { data } = await coachApi.get("/coach/dashboard/statistics", {
      headers: authHeader(token),
    });
    return data?.statistics ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
