import api, { authHeader, normalizeApiError } from "../../api.js";
import { normalizeUser } from "./adminUsers.js";

function usersBase() {
  return "/admin/users";
}

export async function adminConvertUserToHeal(token, userId, { referralCode } = {}) {
  const body = {};
  if (referralCode && String(referralCode).trim()) {
    body.referralCode = String(referralCode).trim().toUpperCase();
  }
  try {
    const { data: res } = await api.post(`${usersBase()}/${encodeURIComponent(userId)}/convert-to-heal`, body, {
      headers: authHeader(token),
    });
    return normalizeUser(res.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminAssignHealUserCoach(token, userId, payload) {
  try {
    const { data: res } = await api.post(`${usersBase()}/${encodeURIComponent(userId)}/assign-coach`, payload, {
      headers: authHeader(token),
    });
    return normalizeUser(res.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReassignHealUserCoach(token, userId, payload) {
  try {
    const { data: res } = await api.post(`${usersBase()}/${encodeURIComponent(userId)}/reassign-coach`, payload, {
      headers: authHeader(token),
    });
    return normalizeUser(res.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListHealUsersByCoach(token, coachId, { page = 1, limit = 20, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(
      `/admin/wellness-coaches/${encodeURIComponent(coachId)}/heal-users?${q}`,
      { headers: authHeader(token) }
    );
    const users = Array.isArray(body.users) ? body.users.map(normalizeUser) : [];
    return {
      users,
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}
