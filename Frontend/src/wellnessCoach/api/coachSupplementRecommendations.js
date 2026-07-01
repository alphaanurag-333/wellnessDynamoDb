import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function healUsersBase(userId) {
  return `/coach/heal-users/${userId}/supplement-recommendations`;
}

export async function coachListUserSupplementRecommendations(token, userId) {
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

export async function coachCreateSupplementRecommendation(token, userId, payload) {
  try {
    const { data: body } = await coachApi.post(healUsersBase(userId), payload, {
      headers: authHeader(token),
    });
    return {
      recommendation: body.recommendation ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachRemoveSupplementRecommendation(token, userId, recommendationId) {
  try {
    await coachApi.delete(`${healUsersBase(userId)}/${recommendationId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
