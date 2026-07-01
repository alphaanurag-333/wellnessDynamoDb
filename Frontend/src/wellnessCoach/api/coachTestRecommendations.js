import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/test-recommendations`;
}

export async function coachListUserTestRecommendations(token, userId) {
  try {
    const { data: body } = await coachApi.get(healUsersBase(userId), {
      headers: authHeader(token),
    });
    return {
      recommendations: body.recommendations ?? [],
      recommended: body.recommended ?? null,
      history: body.history ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateTestRecommendation(token, userId, { reportDate, testIds }) {
  try {
    const { data: body } = await coachApi.post(
      healUsersBase(userId),
      { reportDate, testIds },
      { headers: authHeader(token) }
    );
    return { recommendation: body.recommendation ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteTestRecommendation(token, userId, recommendationId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${recommendationId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListUserLabReports(token, userId) {
  try {
    const { data: body } = await coachApi.get(`/coach/heal-users/${userId}/lab-reports`, {
      headers: authHeader(token),
    });
    return {
      reports: body.reports ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
