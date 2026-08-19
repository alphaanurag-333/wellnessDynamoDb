import api, { normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function authHeader() {
  const token = getAccountToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function asItems(value) {
  return Array.isArray(value) ? value.filter((item) => item && item.name) : [];
}

export async function fetchPendingTasks() {
  try {
    const { data } = await api.get("/account/dashboard/pending-tasks", {
      headers: authHeader(),
    });
    const queues = data?.queues || {};
    return {
      counsellingReports: asItems(queues.counsellingReports),
      mealReview: asItems(queues.mealReview),
      orders: asItems(queues.orders),
      meetings: asItems(queues.meetings),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
