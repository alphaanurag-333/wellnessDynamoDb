import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function basePath(userId) {
  return `/assistant/heal-users/${userId}/metabolic-metrics`;
}

export async function assistantGetMetabolicMetricsDashboard(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(`${basePath(userId)}/dashboard`, {
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

export async function assistantListMetabolicMetricHistory(token, userId, params = {}) {
  try {
    const metricType = params.metricType;
    const path = metricType
      ? `${basePath(userId)}/history/${metricType}`
      : `${basePath(userId)}/history`;
    const { metricType: _omit, ...query } = params;
    const { data: body } = await assistantApi.get(path, {
      headers: authHeader(token),
      params: query,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantSaveFattyLiverMetric(token, userId, payload = {}) {
  try {
    const { data: body } = await assistantApi.post(
      `${basePath(userId)}/fatty-liver`,
      payload,
      { headers: authHeader(token) }
    );
    return { log: body.log ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
