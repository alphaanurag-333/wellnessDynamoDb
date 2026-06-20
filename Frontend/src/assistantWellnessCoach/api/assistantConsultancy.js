import assistantApi, { normalizeApiError } from "./assistantApi.js";
import { getApiBase } from "../../api.js";

export async function assistantListConsultancyTransactions(
  { page = 1, limit = 20, paymentStatus = "all", search } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (paymentStatus) q.set("paymentStatus", paymentStatus);
  if (search) q.set("search", search);
  try {
    const { data: body } = await assistantApi.get(`/assistant/consultancy/transactions?${q}`);
    return {
      transactions: body.transactions ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListConsultancyEnrolledUsers({ page = 1, limit = 20, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search) q.set("search", search);
  try {
    const { data: body } = await assistantApi.get(`/assistant/consultancy/enrolled-users?${q}`);
    return {
      users: body.users ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export function assistantConsultancyInvoiceUrl(transactionId) {
  return `${getApiBase()}/api/assistant/consultancy/transactions/${transactionId}/invoice`;
}
