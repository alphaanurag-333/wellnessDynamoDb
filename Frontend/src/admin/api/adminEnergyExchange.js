import api, { authHeader, getApiBase, normalizeApiError } from "../../api.js";
import { downloadAuthenticatedBlob } from "../../utils/downloadAuthenticatedBlob.js";

function base() {
  return "/admin/energy-exchange";
}

export async function adminListEnergyExchangeTransactions(
  token,
  { page = 1, limit = 20, paymentStatus = "all", coachId, from, to, search } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (paymentStatus) q.set("paymentStatus", paymentStatus);
  if (coachId) q.set("coachId", coachId);
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  if (search) q.set("search", search);
  try {
    const { data: body } = await api.get(`${base()}/transactions?${q}`, { headers: authHeader(token) });
    return {
      transactions: body.transactions ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetEnergyExchangeTransaction(token, transactionId) {
  try {
    const { data: body } = await api.get(`${base()}/transactions/${transactionId}`, {
      headers: authHeader(token),
    });
    return body.transaction ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export function adminEnergyExchangeInvoiceUrl(transactionId) {
  return `${getApiBase()}/api/admin/energy-exchange/transactions/${transactionId}/invoice`;
}

export async function adminDownloadEnergyExchangeInvoice(transactionId, referenceNumber) {
  try {
    await downloadAuthenticatedBlob(
      api,
      `${base()}/transactions/${transactionId}/invoice`,
      `${referenceNumber || transactionId}.pdf`
    );
  } catch (error) {
    normalizeApiError(error);
  }
}
