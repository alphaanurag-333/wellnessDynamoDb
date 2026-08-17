import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchDashboardStatistics() {
  try {
    const { data } = await api.get("/account/dashboard/statistics", {
      headers: authHeader(),
    });
    return data?.statistics ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
