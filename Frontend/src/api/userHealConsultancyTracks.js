import api, { authHeader, normalizeApiError } from "../api.js";

const BASE = "/user/heal-consultancy-tracks";

export async function userListHealConsultancyTracks(token, params = {}) {
  try {
    const { data: body } = await api.get(BASE, {
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

export async function userCreateHealConsultancyTrack(token, payload) {
  try {
    const { data: body } = await api.post(BASE, payload, {
      headers: authHeader(token),
    });
    return body.data?.track ?? body.track ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
