import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function mealTrackingBase(userId) {
  return `/coach/heal-users/${userId}/meal-tracking`;
}

export async function coachGetUserMealTracking(token, userId, { date, days } = {}) {
  try {
    const params = {};
    if (date) params.date = date;
    if (days) params.days = days;

    const { data: body } = await coachApi.get(mealTrackingBase(userId), {
      headers: authHeader(token),
      params,
    });
    return {
      logs: body.logs ?? [],
      macroSummary: body.macroSummary ?? [],
      range: body.range ?? null,
      mealTrackingMode: body.mealTrackingMode ?? "macro",
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateMealLog(token, userId, payload) {
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

      const { data: body } = await coachApi.post(mealTrackingBase(userId), fd, {
        headers: { ...authHeader(token), "Content-Type": "multipart/form-data" },
      });
      data = body;
    } else {
      const { data: body } = await coachApi.post(
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

export async function coachUpdateMealLog(token, userId, logId, payload) {
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

      const { data: body } = await coachApi.put(
        `${mealTrackingBase(userId)}/${logId}`,
        fd,
        { headers: { ...authHeader(token), "Content-Type": "multipart/form-data" } }
      );
      data = body;
    } else {
      const { data: body } = await coachApi.put(
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

export async function coachDeleteMealLog(token, userId, logId) {
  try {
    await coachApi.delete(`${mealTrackingBase(userId)}/${logId}`, {
      headers: authHeader(token),
    });
    return { status: true };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateMealTrackingMode(token, userId, mealTrackingMode) {
  try {
    const { data: body } = await coachApi.patch(
      `/coach/heal-users/${userId}/meal-tracking-mode`,
      { mealTrackingMode },
      { headers: authHeader(token) }
    );
    return {
      mealTrackingMode: body.mealTrackingMode ?? mealTrackingMode,
      user: body.user ?? null,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
