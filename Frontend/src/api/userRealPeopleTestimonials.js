import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/user/real-people-testimonials";
}

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

export async function userCreateRealPeopleTestimonial(token, { review, stars }) {
  try {
    const { data } = await api.post(
      base(),
      { review: String(review ?? "").trim(), stars: Number(stars) },
      { headers: authHeader(token) }
    );
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userUpdateRealPeopleTestimonial(token, id, { review, stars }) {
  const payload = {};
  if (review !== undefined) payload.review = String(review).trim();
  if (stars !== undefined) payload.stars = Number(stars);
  try {
    const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userDeleteRealPeopleTestimonial(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
