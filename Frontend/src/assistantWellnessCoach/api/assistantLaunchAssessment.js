import { getApiBase } from "../../api.js";
import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function userBase(userId) {
  return `/assistant/heal-users/${encodeURIComponent(userId)}/launch-assessment`;
}

export async function assistantListLaunchFocusAreas(token, userId) {
  try {
    const { data: body } = await assistantApi.get(`${userBase(userId)}/focus-areas`, {
      headers: authHeader(token),
    });
    return {
      focusAreas: Array.isArray(body.focusAreas) ? body.focusAreas : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListLaunchQuestions(token, userId) {
  try {
    const { data: body } = await assistantApi.get(`${userBase(userId)}/questions`, {
      headers: authHeader(token),
    });
    return {
      questions: Array.isArray(body.questions) ? body.questions : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListLaunchAssessments(token, userId) {
  try {
    const { data: body } = await assistantApi.get(userBase(userId), { headers: authHeader(token) });
    return {
      assessments: Array.isArray(body.assessments) ? body.assessments : [],
      history: Array.isArray(body.history) ? body.history : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetLaunchAssessmentByDate(token, userId, date) {
  try {
    const q = new URLSearchParams({ date: String(date) });
    const { data: body } = await assistantApi.get(`${userBase(userId)}/by-date?${q}`, {
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

export async function assistantSaveLaunchAssessment(token, userId, payload) {
  try {
    const { data: body } = await assistantApi.post(userBase(userId), payload, {
      headers: authHeader(token),
    });
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateLaunchAssessment(token, userId, assessmentId, payload) {
  try {
    const { data: body } = await assistantApi.patch(
      `${userBase(userId)}/${encodeURIComponent(assessmentId)}`,
      payload,
      { headers: authHeader(token) }
    );
    return body.assessment;
  } catch (error) {
    normalizeApiError(error);
  }
}

export function assistantLaunchQuestionsExportUrl(userId) {
  return `${getApiBase()}/api/assistant/heal-users/${encodeURIComponent(userId)}/launch-assessment/export`;
}

export async function assistantDownloadLaunchQuestionsExport(token, userId, { filename } = {}) {
  const url = assistantLaunchQuestionsExportUrl(userId);
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
