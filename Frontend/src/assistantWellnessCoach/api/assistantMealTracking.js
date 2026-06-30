import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function mealTrackingBase(userId) {
  return `/assistant/heal-users/${userId}/meal-tracking`;
}

export async function assistantGetUserMealTracking(token, userId, { date, days } = {}) {
  try {
    const params = {};
    if (date) params.date = date;
    if (days) params.days = days;

    const { data: body } = await assistantApi.get(mealTrackingBase(userId), {
      headers: authHeader(token),
      params,
    });
    return {
      logs: body.logs ?? [],
      macroSummary: body.macroSummary ?? [],
      range: body.range ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantCreateMealLog(token, userId, payload) {
  try {
    const { photo, items, ...rest } = payload;

    let data;
    if (photo) {
      const fd = new FormData();
      fd.append("photo", photo);
      Object.entries(rest).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (items !== undefined) fd.append("items", JSON.stringify(items));

      const { data: body } = await assistantApi.post(mealTrackingBase(userId), fd, {
        headers: { ...authHeader(token), "Content-Type": "multipart/form-data" },
      });
      data = body;
    } else {
      const { data: body } = await assistantApi.post(
        mealTrackingBase(userId),
        { ...rest, items },
        { headers: authHeader(token) }
      );
      data = body;
    }

    return { mealLog: data.mealLog ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateMealLog(token, userId, logId, payload) {
  try {
    const { photo, items, ...rest } = payload;

    let data;
    if (photo) {
      const fd = new FormData();
      fd.append("photo", photo);
      Object.entries(rest).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, String(v));
      });
      if (items !== undefined) fd.append("items", JSON.stringify(items));

      const { data: body } = await assistantApi.put(
        `${mealTrackingBase(userId)}/${logId}`,
        fd,
        { headers: { ...authHeader(token), "Content-Type": "multipart/form-data" } }
      );
      data = body;
    } else {
      const { data: body } = await assistantApi.put(
        `${mealTrackingBase(userId)}/${logId}`,
        { ...rest, items },
        { headers: authHeader(token) }
      );
      data = body;
    }

    return { mealLog: data.mealLog ?? null };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteMealLog(token, userId, logId) {
  try {
    await assistantApi.delete(`${mealTrackingBase(userId)}/${logId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}
