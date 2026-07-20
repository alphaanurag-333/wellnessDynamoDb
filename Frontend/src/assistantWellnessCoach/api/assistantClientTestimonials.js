import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function base() {
  return "/assistant/client-testimonials";
}

export async function assistantListClientTestimonials(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set("status", status);
  if (search?.trim()) q.set("search", search.trim());
  try {
    const { data } = await assistantApi.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      clientTestimonials: Array.isArray(data.clientTestimonials) ? data.clientTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListPendingClientTestimonials(token) {
  try {
    const { data } = await assistantApi.get(`${base()}/pending`, { headers: authHeader(token) });
    return Array.isArray(data.clientTestimonials) ? data.clientTestimonials : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetClientTestimonialById(token, id) {
  try {
    const { data } = await assistantApi.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.clientTestimonial ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateClientTestimonial(token, id, fields) {
  const payload = {};
  if (fields?.rating !== undefined) payload.rating = Number(fields.rating);
  if (fields?.description !== undefined) payload.description = String(fields.description).trim();
  if (fields?.status !== undefined) payload.status = String(fields.status).trim();
  try {
    const { data } = await assistantApi.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.clientTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteClientTestimonial(token, id) {
  try {
    await assistantApi.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
