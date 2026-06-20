import coachApi, { normalizeApiError } from "./coachApi.js";
import { getApiBase } from "../../api.js";
import { downloadAuthenticatedBlob } from "../../utils/downloadAuthenticatedBlob.js";

export async function coachListConsultancyTransactions(
  { page = 1, limit = 20, paymentStatus = "all", search, scope = "all" } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (paymentStatus) q.set("paymentStatus", paymentStatus);
  if (search) q.set("search", search);
  if (scope) q.set("scope", scope);
  try {
    const { data: body } = await coachApi.get(`/coach/consultancy/transactions?${q}`);
    return {
      transactions: body.transactions ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListConsultancyEnrolledUsers({ page = 1, limit = 20, search, scope = "all" } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search) q.set("search", search);
  if (scope) q.set("scope", scope);
  try {
    const { data: body } = await coachApi.get(`/coach/consultancy/enrolled-users?${q}`);
    return {
      users: body.users ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export function coachConsultancyInvoiceUrl(transactionId) {
  return `${getApiBase()}/api/coach/consultancy/transactions/${transactionId}/invoice`;
}

export async function coachDownloadConsultancyInvoice(transactionId, referenceNumber) {
  try {
    await downloadAuthenticatedBlob(
      coachApi,
      `/coach/consultancy/transactions/${transactionId}/invoice`,
      `${referenceNumber || transactionId}.pdf`
    );
  } catch (error) {
    normalizeApiError(error);
  }
}
