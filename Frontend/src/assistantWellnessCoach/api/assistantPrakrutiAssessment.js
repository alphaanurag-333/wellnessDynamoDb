import { getApiBase } from "../../api.js";
import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function userBase(userId) {
  return `/assistant/heal-users/${encodeURIComponent(userId)}/prakruti-assessment`;
}

export async function assistantListPrakrutiThingsToAvoid(token, userId, { page = 1, limit = 8, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await assistantApi.get(`${userBase(userId)}/things-to-avoid?${q}`, {
      headers: authHeader(token),
    });
    return {
      thingsToAvoid: Array.isArray(body.thingsToAvoid) ? body.thingsToAvoid : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListPrakrutiQuestions(token, userId, { page = 1, limit = 10, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await assistantApi.get(`${userBase(userId)}/questions?${q}`, {
      headers: authHeader(token),
    });
    return {
      questions: Array.isArray(body.questions) ? body.questions : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetPrakrutiAssessment(token, userId) {
  try {
    const { data: body } = await assistantApi.get(userBase(userId), { headers: authHeader(token) });
    return {
      assessment: body.assessment ?? null,
      prakrutiTypes: Array.isArray(body.prakrutiTypes) ? body.prakrutiTypes : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantSavePrakrutiAssessment(token, userId, payload) {
  try {
    const { data: body } = await assistantApi.post(userBase(userId), payload, { headers: authHeader(token) });
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export function assistantPrakrutiQuestionsExportUrl(userId) {
  return `${getApiBase()}/api/assistant/heal-users/${encodeURIComponent(userId)}/prakruti-assessment/export`;
}

export async function assistantDownloadPrakrutiQuestionsExport(token, userId, { filename } = {}) {
  const url = assistantPrakrutiQuestionsExportUrl(userId);
  const response = await fetch(url, { headers: authHeader(token) });
  if (!response.ok) {
    const err = new Error(`Export failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename || `prakruti-assessment-${userId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
