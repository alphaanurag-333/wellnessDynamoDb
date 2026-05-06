import api, { authHeader, normalizeApiError } from "../api.js";

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

export async function adminCreateClientTestimonial(token, fields) {
  if (fields?.file instanceof File) {
    const fd = new FormData();
    fd.append("name", String(fields.name ?? "").trim());
    fd.append("rating", String(fields.rating ?? ""));
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("status", String(fields.status ?? "active").trim());
    fd.append("file", fields.file);
    try {
      const { data } = await api.post(clientTestimonialsBase(), fd, { headers: authHeader(token) });
      return data.clientTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  throw new Error("Profile image upload file is required.");
}

export async function adminUpdateClientTestimonial(token, id, fields) {
  if (fields?.file instanceof File) {
    const fd = new FormData();
    if (fields.name !== undefined) fd.append("name", String(fields.name).trim());
    if (fields.rating !== undefined) fd.append("rating", String(fields.rating));
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status).trim());
    fd.append("file", fields.file);
    try {
      const { data } = await api.patch(`${clientTestimonialsBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return data.clientTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields?.name !== undefined) payload.name = String(fields.name).trim();
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
