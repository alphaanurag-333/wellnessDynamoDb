import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/programs";
}

export async function adminListProgramCatalog(token, { page = 1, limit = 10, status, search, isActive } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (isActive !== undefined && isActive !== "") q.set("isActive", String(isActive));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      programs: Array.isArray(body.programs) ? body.programs : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetProgramCatalogById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.program ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateProgramCatalog(token, fields) {
  try {
    const { data: body } = await api.post(base(), fields, { headers: authHeader(token) });
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateProgramCatalog(token, id, fields) {
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fields, {
      headers: authHeader(token),
    });
    return body.program;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteProgramCatalog(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListProgramTransactions(token, { page = 1, limit = 20, paymentStatus, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (paymentStatus) q.set("paymentStatus", paymentStatus);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}/transactions?${q}`, { headers: authHeader(token) });
    return {
      transactions: Array.isArray(body.transactions) ? body.transactions : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDownloadProgramInvoice(token, transactionId, referenceNumber) {
  try {
    const { data } = await api.get(`${base()}/transactions/${encodeURIComponent(transactionId)}/invoice`, {
      headers: authHeader(token),
      responseType: "blob",
    });
    const url = window.URL.createObjectURL(new Blob([data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${referenceNumber || transactionId || "invoice"}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    normalizeApiError(error);
  }
}
