import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function healUsersBase(userId) {
  return `/assistant/heal-users/${userId}/supplement-recommendations`;
}

export async function assistantListUserSupplementRecommendations(token, userId) {
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

export async function assistantCreateSupplementRecommendation(token, userId, payload) {
  try {
    const { data: body } = await assistantApi.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return {
      recommendation: body.recommendation ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantRemoveSupplementRecommendation(token, userId, recommendationId) {
  try {
    await assistantApi.delete(`${healUsersBase(userId)}/${recommendationId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
