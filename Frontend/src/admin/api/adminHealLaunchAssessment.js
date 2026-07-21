import { getApiBase } from "../../api.js";
import api, { authHeader, normalizeApiError } from "../../api.js";

function userBase(userId) {
  return `/admin/heal-users/${encodeURIComponent(userId)}/launch-assessment`;
}

export async function adminListLaunchFocusAreas(token, userId, { page = 1, limit = 8, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await api.get(`${userBase(userId)}/focus-areas?${q}`, {
      headers: authHeader(token),
    });
    return {
      focusAreas: Array.isArray(body.focusAreas) ? body.focusAreas : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListLaunchQuestions(token, userId, { page = 1, limit = 10, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await api.get(`${userBase(userId)}/questions?${q}`, {
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

export async function adminListLaunchAssessments(token, userId) {
  try {
    const { data: body } = await api.get(userBase(userId), { headers: authHeader(token) });
    return {
      assessments: Array.isArray(body.assessments) ? body.assessments : [],
      history: Array.isArray(body.history) ? body.history : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetLaunchAssessmentByDate(token, userId, date) {
  try {
    const q = new URLSearchParams({ date: String(date) });
    const { data: body } = await api.get(`${userBase(userId)}/by-date?${q}`, {
      headers: authHeader(token),
    });
    return {
      assessment: body.assessment ?? null,
      scoreRange: body.scoreRange ?? { min: 0, max: 750 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminSaveLaunchAssessment(token, userId, payload) {
  try {
    const { data: body } = await api.post(userBase(userId), payload, {
      headers: authHeader(token),
    });
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLaunchAssessment(token, userId, assessmentId, payload) {
  try {
    const { data: body } = await api.patch(
      `${userBase(userId)}/${encodeURIComponent(assessmentId)}`,
      payload,
      { headers: authHeader(token) }
    );
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export function adminLaunchQuestionsExportUrl(userId) {
  return `${getApiBase()}/api/admin/heal-users/${encodeURIComponent(userId)}/launch-assessment/export`;
}

export async function adminDownloadLaunchQuestionsExport(token, userId, { filename } = {}) {
  const url = adminLaunchQuestionsExportUrl(userId);
  const response = await fetch(url, {
    headers: authHeader(token),
  });
  if (!response.ok) {
    const err = new Error(`Export failed (${response.status})`);
    err.status = response.status;
    throw err;
  }
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename || `launch-questions-${userId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
