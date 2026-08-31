import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

function headers() {
  return { headers: authHeader(getAccountToken()) };
}

function tracksPath(userId, suffix = "") {
  return `/account/heal-users/${encodeURIComponent(userId)}/heal-consultancy-tracks${suffix}`;
}

export async function fetchHealConsultancyTracks(userId, { page = 1, limit = 20 } = {}) {
  try {
    const { data } = await api.get(tracksPath(userId), {
      ...headers(),
      params: { page, limit },
    });
    return data.data || { tracks: [], activeTrack: null, pagination: {} };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function offerHealConsultancyPeriods(userId, trackId, payload) {
  try {
    const { data } = await api.patch(
      tracksPath(userId, `/${encodeURIComponent(trackId)}/offer-periods`),
      payload,
      headers(),
    );
    return data.data?.track;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function confirmHealConsultancyTime(userId, trackId, payload) {
  try {
    const { data } = await api.patch(
      tracksPath(userId, `/${encodeURIComponent(trackId)}/confirm-time`),
      payload,
      headers(),
    );
    return data.data?.track;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function acceptHealConsultancyRequest(userId, trackId, payload = {}) {
  try {
    const { data } = await api.post(
      tracksPath(userId, `/${encodeURIComponent(trackId)}/accept-request`),
      payload,
      headers(),
    );
    return data.data?.track;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function rejectHealConsultancyRequest(userId, trackId, payload = {}) {
  try {
    const { data } = await api.post(
      tracksPath(userId, `/${encodeURIComponent(trackId)}/reject-request`),
      payload,
      headers(),
    );
    return data.data?.track;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function updateHealConsultancyTrack(userId, trackId, payload) {
  try {
    const { data } = await api.patch(
      tracksPath(userId, `/${encodeURIComponent(trackId)}`),
      payload,
      headers(),
    );
    return data.data?.track;
  } catch (error) {
    normalizeApiError(error);
  }
}
