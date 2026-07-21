import api, { authHeader, normalizeApiError } from "../../api.js";

function settingsBase(userId) {
  return `/admin/heal-users/${userId}/daily-reflection-settings`;
}

function historyBase(userId) {
  return `/admin/heal-users/${userId}/daily-reflection/history`;
}

export async function adminGetDailyReflectionHistory(token, userId, month) {
  try {
    const { data: body } = await api.get(historyBase(userId), {
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

export async function adminGetDailyReflectionSettings(token, userId) {
  try {
    const { data: body } = await api.get(settingsBase(userId), {
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
