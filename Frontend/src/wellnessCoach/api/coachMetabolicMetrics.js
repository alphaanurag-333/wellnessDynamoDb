import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function basePath(userId) {
  return `/coach/heal-users/${userId}/metabolic-metrics`;
}

export async function coachGetMetabolicMetricsDashboard(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(`${basePath(userId)}/dashboard`, {
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

export async function coachListMetabolicMetricHistory(token, userId, params = {}) {
  try {
    const metricType = params.metricType;
    const path = metricType
      ? `${basePath(userId)}/history/${metricType}`
      : `${basePath(userId)}/history`;
    const { metricType: _omit, ...query } = params;
    const { data: body } = await coachApi.get(path, {
      headers: authHeader(token),
      params: query,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
