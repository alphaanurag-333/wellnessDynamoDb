import api, { authHeader, normalizeApiError } from "../../api.js";

function settingsPath(userId) {
  return `/admin/heal-users/${userId}/health-progress-settings`;
}

function historyPath(userId, segment) {
  return `/admin/heal-users/${userId}/health-progress/${segment}`;
}

export async function adminGetHealthProgressSettings(token, userId) {
  try {
    const { data: body } = await api.get(settingsPath(userId), {
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

export async function adminUpdateHealthProgressSettings(token, userId, settings) {
  try {
    const { data: body } = await api.patch(settingsPath(userId), settings, {
      headers: authHeader(token),
    });
    return {
      settings: body.settings ?? settings,
      storedSettings: body.storedSettings ?? settings,
      user: body.user ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealthProgressWeight(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(historyPath(userId, "weight"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealthProgressGlucose(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(historyPath(userId, "glucose"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealthProgressBloodPressure(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(historyPath(userId, "blood-pressure"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealthProgressMenstrualCycle(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(historyPath(userId, "menstrual-cycle"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealthProgressCondition(token, userId, params = {}) {
  try {
    const { data: body } = await api.get(historyPath(userId, "condition-comparison"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
