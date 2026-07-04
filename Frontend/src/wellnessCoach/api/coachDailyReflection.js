import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function settingsBase(userId) {
  return `/coach/heal-users/${userId}/daily-reflection-settings`;
}

function historyBase(userId) {
  return `/coach/heal-users/${userId}/daily-reflection/history`;
}

export async function coachGetDailyReflectionHistory(token, userId, month) {
  try {
    const { data: body } = await coachApi.get(historyBase(userId), {
      headers: authHeader(token),
      params: month ? { month } : undefined,
    });
    return {
      month: body.month ?? month,
      history: Array.isArray(body.history) ? body.history : [],
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetDailyReflectionSettings(token, userId) {
  try {
    const { data: body } = await coachApi.get(settingsBase(userId), {
      headers: authHeader(token),
    });
    return {
      activities: body.activities ?? [],
      storedSettings: body.storedSettings ?? {},
      updatedAt: body.updatedAt ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateDailyReflectionSettings(token, userId, activities) {
  try {
    const { data: body } = await coachApi.patch(
      settingsBase(userId),
      { activities },
      { headers: authHeader(token) }
    );
    return {
      activities: body.activities ?? [],
      storedSettings: body.storedSettings ?? {},
      updatedAt: body.updatedAt ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
