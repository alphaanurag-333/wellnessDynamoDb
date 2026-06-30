import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/medical-condition-questions";
}

export async function adminListMedicalConditionQuestions(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
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

export async function adminGetMedicalConditionQuestionById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.question ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateMedicalConditionQuestion(token, fields) {
  try {
    const { data: body } = await api.post(
      base(),
      {
        question: String(fields.question ?? "").trim(),
        answerType: String(fields.answerType || "text"),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.question;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMedicalConditionQuestion(token, id, fields) {
  const payload = {};
  if (fields.question !== undefined) payload.question = String(fields.question).trim();
  if (fields.answerType !== undefined) payload.answerType = String(fields.answerType);
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

export async function adminDeleteMedicalConditionQuestion(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
