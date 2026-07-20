import api, { authHeader, normalizeApiError } from "../../api.js";

function clientTestimonialsBase() {
  return "/admin/client-testimonials";
}

export async function adminListClientTestimonials(token, { page = 1, limit = 10, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${clientTestimonialsBase()}?${q}`, { headers: authHeader(token) });
    return {
      clientTestimonials: Array.isArray(data.clientTestimonials) ? data.clientTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetClientTestimonialById(token, id) {
  try {
    const { data } = await api.get(`${clientTestimonialsBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.clientTestimonial ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateClientTestimonial(token, id, fields) {
  const payload = {};
  if (fields?.rating !== undefined) payload.rating = Number(fields.rating);
  if (fields?.description !== undefined) payload.description = String(fields.description).trim();
  if (fields?.status !== undefined) payload.status = String(fields.status).trim();

  try {
    const { data } = await api.patch(`${clientTestimonialsBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.clientTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteClientTestimonial(token, id) {
  try {
    await api.delete(`${clientTestimonialsBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
