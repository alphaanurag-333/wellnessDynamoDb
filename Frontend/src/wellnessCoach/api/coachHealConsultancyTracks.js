import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function basePath(userId) {
  return `/coach/heal-users/${userId}/heal-consultancy-tracks`;
}

export async function coachListHealConsultancyTracks(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(basePath(userId), {
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

export async function coachUpdateHealConsultancyTrack(token, userId, trackId, payload) {
  try {
    const { data: body } = await coachApi.patch(`${basePath(userId)}/${trackId}`, payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateHealConsultancyTrack(token, userId, payload) {
  try {
    const { data: body } = await coachApi.post(basePath(userId), payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteHealConsultancyTrack(token, userId, trackId) {
  try {
    await coachApi.delete(`${basePath(userId)}/${trackId}`, {
      headers: authHeader(token),
    });
    return true;
  } catch (error) {
    normalizeApiError(error);
  }
}
