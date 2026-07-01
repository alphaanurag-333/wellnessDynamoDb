import { getApiBase } from "../../api.js";
import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function userBase(userId) {
  return `/coach/heal-users/${encodeURIComponent(userId)}/launch-assessment`;
}

export async function coachListLaunchFocusAreas(token, userId, { page = 1, limit = 8, search } = {}) {
  try {
    const q = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search && String(search).trim()) q.set("search", String(search).trim());
    const { data: body } = await coachApi.get(`${userBase(userId)}/focus-areas?${q}`, {
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

export async function coachListLaunchQuestions(token, userId, { page = 1, limit = 10, search } = {}) {
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

export async function coachListLaunchAssessments(token, userId) {
  try {
    const { data: body } = await coachApi.get(userBase(userId), { headers: authHeader(token) });
    return {
      assessments: Array.isArray(body.assessments) ? body.assessments : [],
      history: Array.isArray(body.history) ? body.history : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetLaunchAssessmentByDate(token, userId, date) {
  try {
    const q = new URLSearchParams({ date: String(date) });
    const { data: body } = await coachApi.get(`${userBase(userId)}/by-date?${q}`, { headers: authHeader(token) });
    return {
      assessment: body.assessment ?? null,
      scoreRange: body.scoreRange ?? { min: 0, max: 750 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachSaveLaunchAssessment(token, userId, payload) {
  try {
    const { data: body } = await coachApi.post(userBase(userId), payload, { headers: authHeader(token) });
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateLaunchAssessment(token, userId, assessmentId, payload) {
  try {
    const { data: body } = await coachApi.patch(
      `${userBase(userId)}/${encodeURIComponent(assessmentId)}`,
      payload,
      { headers: authHeader(token) }
    );
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteLaunchAssessment(token, userId, assessmentId) {
  try {
    await coachApi.delete(`${userBase(userId)}/${encodeURIComponent(assessmentId)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export function coachLaunchQuestionsExportUrl(userId) {
  return `${getApiBase()}/api/coach/heal-users/${encodeURIComponent(userId)}/launch-assessment/export`;
}

export async function coachDownloadLaunchQuestionsExport(token, userId, { filename } = {}) {
  const url = coachLaunchQuestionsExportUrl(userId);
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
  link.download = filename || `launch-assessment-${userId}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
}
