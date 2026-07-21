import api, { authHeader, normalizeApiError } from "../../api.js";

function basePath(userId) {
  return `/admin/heal-users/${userId}/metabolic-metrics`;
}

export async function adminGetMetabolicMetricsDashboard(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(`${basePath(userId)}/dashboard`, {
      headers: authHeader(token),
      params,
    });
    return {
      dashboard: body.dashboard ?? {},
      user: body.user ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListMetabolicMetricHistory(token, userId, params = {}) {
  try {
    const metricType = params.metricType;
    const path = metricType
      ? `${basePath(userId)}/history/${metricType}`
      : `${basePath(userId)}/history`;
    const { metricType: _omit, ...query } = params;
    const { data: body } = await api.get(path, {
      headers: authHeader(token),
      params: query,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminSaveFattyLiverMetric(token, userId, payload = {}) {
  try {
    const { data: body } = await api.post(
      `${basePath(userId)}/fatty-liver`,
      payload,
      { headers: authHeader(token) }
    );
    return { log: body.log ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
