import api, { authHeader, normalizeApiError } from "../../api.js";

function healUsersBase(userId) {
  return `/admin/heal-users/${userId}/supplement-recommendations`;
}

export async function adminListUserSupplementRecommendations(token, userId) {
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

export async function adminCreateSupplementRecommendation(token, userId, payload) {
  try {
    const { data: body } = await api.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return {
      recommendation: body.recommendation ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRemoveSupplementRecommendation(token, userId, recommendationId) {
  try {
    await api.delete(`${healUsersBase(userId)}/${recommendationId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
