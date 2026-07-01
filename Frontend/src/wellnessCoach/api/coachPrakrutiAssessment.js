import { getApiBase } from "../../api.js";
import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function userBase(userId) {
  return `/coach/heal-users/${encodeURIComponent(userId)}/prakruti-assessment`;
}

export async function coachListPrakrutiThingsToAvoid(token, userId, { page = 1, limit = 8, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await coachApi.get(`${userBase(userId)}/things-to-avoid?${q}`, {
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

export async function coachListPrakrutiQuestions(token, userId, { page = 1, limit = 10, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await coachApi.get(`${userBase(userId)}/questions?${q}`, {
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

export async function coachGetPrakrutiAssessment(token, userId) {
  try {
    const { data: body } = await coachApi.get(userBase(userId), { headers: authHeader(token) });
    return {
      assessment: body.assessment ?? null,
      prakrutiTypes: Array.isArray(body.prakrutiTypes) ? body.prakrutiTypes : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachSavePrakrutiAssessment(token, userId, payload) {
  try {
    const { data: body } = await coachApi.post(userBase(userId), payload, { headers: authHeader(token) });
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export function coachPrakrutiQuestionsExportUrl(userId) {
  return `${getApiBase()}/api/coach/heal-users/${encodeURIComponent(userId)}/prakruti-assessment/export`;
}

export async function coachDownloadPrakrutiQuestionsExport(token, userId, { filename } = {}) {
  const url = coachPrakrutiQuestionsExportUrl(userId);
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
