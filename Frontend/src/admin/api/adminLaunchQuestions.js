import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/launch-questions";
}

export async function adminListLaunchQuestions(token, { page = 1, limit = 50, status, search, category } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (category && String(category).trim()) q.set("category", String(category).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      questions: Array.isArray(body.questions) ? body.questions : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetLaunchQuestionById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.question ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateLaunchQuestion(token, fields) {
  try {
    const { data: body } = await api.post(
      base(),
      {
        category: String(fields.category ?? "").trim(),
        question: String(fields.question ?? "").trim(),
        sortOrder: Number(fields.sortOrder) || 0,
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.question;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLaunchQuestion(token, id, fields) {
  const payload = {};
  if (fields.category !== undefined) payload.category = String(fields.category).trim();
  if (fields.question !== undefined) payload.question = String(fields.question).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = Number(fields.sortOrder) || 0;
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.question;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLaunchQuestion(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
