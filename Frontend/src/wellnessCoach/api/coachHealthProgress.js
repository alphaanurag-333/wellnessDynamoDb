import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function settingsPath(userId) {
  return `/coach/heal-users/${userId}/health-progress-settings`;
}

function historyPath(userId, segment) {
  return `/coach/heal-users/${userId}/health-progress/${segment}`;
}

export async function coachGetHealthProgressSettings(token, userId) {
  try {
    const { data: body } = await coachApi.get(settingsPath(userId), {
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

export async function coachUpdateHealthProgressSettings(token, userId, settings) {
  try {
    const { data: body } = await coachApi.patch(
      settingsPath(userId),
      settings,
      { headers: authHeader(token) }
    );
    return {
      settings: body.settings ?? settings,
      storedSettings: body.storedSettings ?? settings,
      user: body.user ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListHealthProgressWeight(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(historyPath(userId, "weight"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListHealthProgressGlucose(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(historyPath(userId, "glucose"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListHealthProgressBloodPressure(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(historyPath(userId, "blood-pressure"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListHealthProgressMenstrualCycle(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(historyPath(userId, "menstrual-cycle"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachListHealthProgressCondition(token, userId, params = {}) {
  try {
    const { data: body } = await coachApi.get(historyPath(userId, "condition-comparison"), {
      headers: authHeader(token),
      params,
    });
    return { logs: body.logs ?? [], pagination: body.pagination ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}
