import api, { authHeader, normalizeApiError } from "../../api.js";

function basePath(userId) {
  return `/admin/heal-users/${userId}/heal-consultancy-tracks`;
}

export async function adminListHealConsultancyTracks(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(basePath(userId), {
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

export async function adminUpdateHealConsultancyTrack(token, userId, trackId, payload) {
  try {
    const { data: body } = await api.patch(`${basePath(userId)}/${trackId}`, payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateHealConsultancyTrack(token, userId, payload) {
  try {
    const { data: body } = await api.post(basePath(userId), payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteHealConsultancyTrack(token, userId, trackId) {
  try {
    await api.delete(`${basePath(userId)}/${trackId}`, {
      headers: authHeader(token),
    });
    return true;
  } catch (error) {
    normalizeApiError(error);
  }
}
