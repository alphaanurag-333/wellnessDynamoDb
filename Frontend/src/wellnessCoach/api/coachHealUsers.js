import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function normalizeUser(user) {
  if (!user) return null;
  const id = String(user._id || user.id || "");
  return { ...user, id, _id: id };
}

export async function coachListHealUsers(token, { page = 1, limit = 20, search, scope = "all" } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (scope && scope !== "all") q.set("scope", scope);
  try {
    const { data: body } = await coachApi.get(`/coach/heal-users?${q}`, {
      headers: authHeader(token),
    });
    const users = Array.isArray(body.users) ? body.users.map(normalizeUser) : [];
    return {
      users,
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachReassignHealUser(token, userId, payload) {
  try {
    const { data: res } = await coachApi.post(
      `/coach/heal-users/${encodeURIComponent(userId)}/reassign`,
      payload,
      { headers: authHeader(token) }
    );
    return normalizeUser(res.user);
  } catch (error) {
    normalizeApiError(error);
  }
}
