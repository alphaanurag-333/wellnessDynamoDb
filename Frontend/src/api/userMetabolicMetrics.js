import api, { authHeader, normalizeApiError } from "../api.js";

const BASE = "/user/metabolic-metrics";

export async function userGetMetabolicMetricsProfile(token) {
  try {
    const { data: body } = await api.get(`${BASE}/profile`, { headers: authHeader(token) });
    return body.data ?? body;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userGetMetabolicMetricsDashboard(token, params = {}) {
  try {
    const { data: body } = await api.get(`${BASE}/dashboard`, {
      headers: authHeader(token),
      params,
    });
    return body.data?.dashboard ?? body.dashboard ?? {};
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userSaveMetabolicMetric(token, metricType, payload) {
  try {
    const { data: body } = await api.post(`${BASE}/${metricType}`, payload, {
      headers: authHeader(token),
    });
    return body.data?.log ?? body.log ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userListMetabolicMetricHistory(token, params = {}) {
  try {
    const metricType = params.metricType;
    const path = metricType ? `${BASE}/history/${metricType}` : `${BASE}/history`;
    const { metricType: _omit, ...query } = params;
    const { data: body } = await api.get(path, {
      headers: authHeader(token),
      params: query,
    });
    return {
      logs: body.data?.logs ?? body.logs ?? [],
      pagination: body.data?.pagination ?? body.pagination ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
