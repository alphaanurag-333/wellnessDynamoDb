import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function medicalQuestionBase() {
  return "/admin/medical-condition-questions";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function mapQuestion(row) {
  if (!row) return null;
  const answerType = String(row.answerType || "text").toLowerCase();
  return {
    id: row.id,
    question: row.question || "",
    answerType,
    status: row.status === "inactive" ? "inactive" : "active",
    shown: row.status !== "inactive",
    sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : 0,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function mapQuestionsToDropdownList(questions = []) {
  return {
    id: "medical-questions",
    slug: "medical-questions",
    title: "Medical condition questions",
    wide: true,
    status: "active",
    sortOrder: 1,
    options: questions.map((row, index) => ({
      id: row.id,
      label: row.question || "",
      value: row.id,
      answerType: row.answerType || "text",
      on: row.shown !== false,
      sortOrder: Number.isFinite(Number(row.sortOrder)) ? Number(row.sortOrder) : index + 1,
    })),
  };
}

export async function adminListMedicalConditionQuestions(token, { page = 1, limit = 200, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${medicalQuestionBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const questions = (Array.isArray(data.questions) ? data.questions : []).map(mapQuestion).filter(Boolean);
    return {
      questions,
      pagination: data.pagination ?? { page, limit, total: questions.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateMedicalConditionQuestion(token, fields) {
  try {
    const { data } = await api.post(
      medicalQuestionBase(),
      {
        question: String(fields.question ?? "").trim(),
        answerType: String(fields.answerType || "yes_no_text"),
        status: fields.status || (fields.shown === false ? "inactive" : "active"),
        ...(fields.sortOrder !== undefined ? { sortOrder: fields.sortOrder } : {}),
      },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMedicalConditionQuestion(token, id, fields) {
  const payload = {};
  if (fields.question !== undefined) payload.question = String(fields.question).trim();
  if (fields.answerType !== undefined) payload.answerType = String(fields.answerType);
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.shown !== undefined) payload.status = fields.shown ? "active" : "inactive";
  if (fields.sortOrder !== undefined) payload.sortOrder = fields.sortOrder;

  try {
    const { data } = await api.patch(`${medicalQuestionBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapQuestion(data.question);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReorderMedicalConditionQuestions(token, orderedIds) {
  try {
    const { data } = await api.put(
      `${medicalQuestionBase()}/reorder`,
      { orderedIds },
      { headers: authHeader(tokenOrStored(token)) },
    );
    return (Array.isArray(data.questions) ? data.questions : []).map(mapQuestion).filter(Boolean);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteMedicalConditionQuestion(token, id) {
  try {
    await api.delete(`${medicalQuestionBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
