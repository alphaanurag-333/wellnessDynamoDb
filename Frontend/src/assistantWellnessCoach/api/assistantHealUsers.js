import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function normalizeUser(user) {
  if (!user) return null;
  const id = String(user._id || user.id || "");
  return { ...user, id, _id: id };
}

export async function assistantListHealUsers(_token, { page = 1, limit = 20, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await assistantApi.get(`/assistant/heal-users?${q}`);
    const users = Array.isArray(body.users) ? body.users.map(normalizeUser) : [];
    return {
      users,
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetUserWaterTracking(token, userId, { days = 7, from, to } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await assistantApi.get(
      `/assistant/heal-users/${userId}/water-tracking${suffix}`,
      { headers: authHeader(token) }
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { settings: {}, history: [], range: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetUserStepsTracking(token, userId, { days = 7, from, to } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await assistantApi.get(
      `/assistant/heal-users/${userId}/steps-tracking${suffix}`,
      { headers: authHeader(token) }
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { settings: {}, history: [], range: {}, connections: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetUserSleepTracking(token, userId, { days = 7, date } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (date) q.set("date", date);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await assistantApi.get(
      `/assistant/heal-users/${userId}/sleep-tracking${suffix}`,
      { headers: authHeader(token) }
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { today: {}, history: [], range: {}, connections: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetUserHeartRateTracking(token, userId, { days = 7, date } = {}) {
  const q = new URLSearchParams();
  if (days != null) q.set("days", String(days));
  if (date) q.set("date", date);
  const suffix = q.toString() ? `?${q}` : "";
  try {
    const { data: body } = await assistantApi.get(
      `/assistant/heal-users/${userId}/heart-rate-tracking${suffix}`,
      { headers: authHeader(token) }
    );
    return {
      user: body.user ?? null,
      data: body.data ?? { today: {}, history: [], range: {}, connections: {} },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
