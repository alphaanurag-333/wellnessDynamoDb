import api, { authHeader, getApiBase, normalizeApiError } from "../../api.js";
import { downloadAuthenticatedBlob } from "../../utils/downloadAuthenticatedBlob.js";

function base() {
  return "/admin/consultancy";
}

export async function adminListConsultancyTransactions(
  token,
  { page = 1, limit = 20, paymentStatus = "all", referralCode, coachId, from, to, search } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (paymentStatus) q.set("paymentStatus", paymentStatus);
  if (referralCode) q.set("referralCode", referralCode);
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

export async function adminGetConsultancyTransaction(token, transactionId) {
  try {
    const { data: body } = await api.get(`${base()}/transactions/${transactionId}`, {
      headers: authHeader(token),
    });
    return body.transaction ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListEnrolledUsers(
  token,
  { page = 1, limit = 20, search, userTier = "heal", coachId } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search) q.set("search", search);
  if (userTier) q.set("userTier", userTier);
  if (coachId) q.set("coachId", coachId);
  try {
    const { data: body } = await api.get(`${base()}/enrolled-users?${q}`, { headers: authHeader(token) });
    return {
      users: body.users ?? [],
      pagination: body.pagination ?? { page: 1, limit: 20, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export function adminConsultancyInvoiceUrl(transactionId) {
  return `${getApiBase()}/api/admin/consultancy/transactions/${transactionId}/invoice`;
}

export async function adminDownloadConsultancyInvoice(transactionId, referenceNumber) {
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
