import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function faqBase() {
  return "/admin/faq";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapFaq(row) {
  if (!row) return null;
  return {
    id: row.id,
    question: row.question || "",
    answer: row.answer || "",
    status: row.status === "inactive" ? "inactive" : "active",
    shown: row.status !== "inactive",
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListFaqs(token, { page = 1, limit = 200, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${faqBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const faqs = (Array.isArray(data.faqs) ? data.faqs : []).map(mapFaq);
    return {
      faqs,
      pagination: data.pagination ?? { page, limit, total: faqs.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateFaq(token, fields) {
  try {
    const { data } = await api.post(
      faqBase(),
      {
        question: String(fields.question ?? "").trim(),
        answer: String(fields.answer ?? "").trim(),
        status: fields.status || (fields.shown === false ? "inactive" : "active"),
        ...(fields.sortOrder !== undefined ? { sortOrder: fields.sortOrder } : {}),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapFaq(data.faq);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateFaq(token, id, fields) {
  const payload = {};
  if (fields.question !== undefined) payload.question = String(fields.question).trim();
  if (fields.answer !== undefined) payload.answer = String(fields.answer).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.shown !== undefined) payload.status = fields.shown ? "active" : "inactive";
  if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;

  try {
    const { data } = await api.patch(`${faqBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapFaq(data.faq);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReorderFaqs(token, orderedIds) {
  try {
    const { data } = await api.put(
      `${faqBase()}/reorder`,
      { orderedIds },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return (Array.isArray(data.faqs) ? data.faqs : []).map(mapFaq);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteFaq(token, id) {
  try {
    await api.delete(`${faqBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
