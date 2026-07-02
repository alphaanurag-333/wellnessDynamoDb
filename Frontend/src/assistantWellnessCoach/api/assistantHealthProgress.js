import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function settingsPath(userId) {
  return `/assistant/heal-users/${userId}/health-progress-settings`;
}

function historyPath(userId, segment) {
  return `/assistant/heal-users/${userId}/health-progress/${segment}`;
}

export async function assistantGetHealthProgressSettings(token, userId) {
  try {
    const { data: body } = await assistantApi.get(settingsPath(userId), {
      headers: authHeader(token),
    });
    return {
      settings: body.settings ?? {},
      storedSettings: body.storedSettings ?? {},
      gender: body.gender ?? null,
      isFemale: Boolean(body.isFemale),
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListHealthProgressWeight(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(historyPath(userId, "weight"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListHealthProgressGlucose(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(historyPath(userId, "glucose"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListHealthProgressBloodPressure(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(historyPath(userId, "blood-pressure"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListHealthProgressMenstrualCycle(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(historyPath(userId, "menstrual-cycle"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListHealthProgressCondition(token, userId, params = {}) {
  try {
    const { data: body } = await assistantApi.get(historyPath(userId, "condition-comparison"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
