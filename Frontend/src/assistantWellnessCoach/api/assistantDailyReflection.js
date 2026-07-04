import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function settingsBase(userId) {
  return `/assistant/heal-users/${userId}/daily-reflection-settings`;
}

function historyBase(userId) {
  return `/assistant/heal-users/${userId}/daily-reflection/history`;
}

export async function assistantGetDailyReflectionHistory(token, userId, month) {
  try {
    const { data: body } = await assistantApi.get(historyBase(userId), {
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

export async function assistantGetDailyReflectionSettings(token, userId) {
  try {
    const { data: body } = await assistantApi.get(settingsBase(userId), {
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
