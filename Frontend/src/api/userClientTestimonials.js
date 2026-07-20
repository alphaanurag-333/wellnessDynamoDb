import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/user/client-testimonials";
}

export async function userListClientTestimonials(token, { page = 1, limit = 20 } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      clientTestimonials: Array.isArray(data.clientTestimonials) ? data.clientTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Returns the user's single review, or null. */
export async function userGetMyClientTestimonial(token) {
  try {
    const { data } = await api.get(`${base()}/me`, { headers: authHeader(token) });
    return data.clientTestimonial ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userCreateClientTestimonial(token, fields) {
  const payload = {
    description: String(fields?.description ?? fields?.review ?? "").trim(),
    rating: Number(fields?.rating ?? fields?.stars),
  };

  try {
    const { data } = await api.post(base(), payload, { headers: authHeader(token) });
    return data.clientTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userUpdateClientTestimonial(token, id, fields) {
  const payload = {};
  if (fields?.description !== undefined || fields?.review !== undefined) {
    payload.description = String(fields.description ?? fields.review).trim();
  }
  if (fields?.rating !== undefined || fields?.stars !== undefined) {
    payload.rating = Number(fields.rating ?? fields.stars);
  }

  try {
    const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.clientTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function userDeleteClientTestimonial(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
