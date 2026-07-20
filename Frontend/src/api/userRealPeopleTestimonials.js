import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/user/real-people-testimonials";
}

/** Read-only: Real People : Real Healing is admin-managed. */
export async function userListRealPeopleTestimonials(token, { page = 1, limit = 20, healthConcernId } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (healthConcernId) q.set("healthConcernId", String(healthConcernId));
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      realPeopleTestimonials: Array.isArray(data.realPeopleTestimonials) ? data.realPeopleTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userGetRealPeopleTestimonialById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.realPeopleTestimonial ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}
