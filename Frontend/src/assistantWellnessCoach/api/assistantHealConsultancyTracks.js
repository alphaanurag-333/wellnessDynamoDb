import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function basePath(userId) {
  return `/assistant/heal-users/${userId}/heal-consultancy-tracks`;
}

export async function assistantListHealConsultancyTracks(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(basePath(userId), {
      headers: authHeader(token),
      params,
    });
    return {
      tracks: body.data?.tracks ?? body.tracks ?? [],
      pagination: body.data?.pagination ?? body.pagination ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateHealConsultancyTrack(token, userId, trackId, payload) {
  try {
    const { data: body } = await assistantApi.patch(`${basePath(userId)}/${trackId}`, payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantCreateHealConsultancyTrack(token, userId, payload) {
  try {
    const { data: body } = await assistantApi.post(basePath(userId), payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteHealConsultancyTrack(token, userId, trackId) {
  try {
    await assistantApi.delete(`${basePath(userId)}/${trackId}`, {
      headers: authHeader(token),
    });
    return true;
  } catch (error) {
    normalizeApiError(error);
  }
}
