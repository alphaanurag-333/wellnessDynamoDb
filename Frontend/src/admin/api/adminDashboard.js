import api, { authHeader, normalizeApiError } from "../../api.js";

export async function adminGetDashboardStatistics(token) {
  try {
    const { data } = await api.get("/admin/dashboard/statistics", { headers: authHeader(token) });
    return data?.statistics ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
