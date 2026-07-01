import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/test-recommendations`;
}

export async function assistantListUserTestRecommendations(token, userId) {
  try {
    const { data: body } = await assistantApi.get(healUsersBase(userId), {
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

export async function assistantCreateTestRecommendation(token, userId, { reportDate, testIds }) {
  try {
    const { data: body } = await assistantApi.post(
      healUsersBase(userId),
      { reportDate, testIds },
      { headers: authHeader(token) }
    );
    return { recommendation: body.recommendation ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteTestRecommendation(token, userId, recommendationId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${recommendationId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListUserLabReports(token, userId) {
  try {
    const { data: body } = await assistantApi.get(`/assistant/heal-users/${userId}/lab-reports`, {
      headers: authHeader(token),
    });
    return {
      reports: body.reports ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
