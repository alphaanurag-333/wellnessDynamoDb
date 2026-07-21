import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/test-recommendations`;
}

export async function adminListUserTestRecommendations(token, userId) {
  try {
    const { data: body } = await api.get(healUsersBase(userId), {
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

export async function adminCreateTestRecommendation(token, userId, { reportDate, testIds }) {
  try {
    const { data: body } = await api.post(
      healUsersBase(userId),
      { reportDate, testIds },
      { headers: authHeader(token) }
    );
    return { recommendation: body.recommendation ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteTestRecommendation(token, userId, recommendationId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${recommendationId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListUserLabReports(token, userId) {
  try {
    const { data: body } = await api.get(`/admin/heal-users/${userId}/lab-reports`, {
      headers: authHeader(token),
    });
    return {
      reports: body.reports ?? [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
