import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function settingsBase(userId) {
  return `/assistant/heal-users/${userId}/daily-reflection-settings`;
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
