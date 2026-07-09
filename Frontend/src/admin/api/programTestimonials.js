import api, { authHeader, normalizeApiError } from "../../api.js";

function programTestimonialsBase() {
  return "/admin/program-testimonials";
}

export async function adminListProgramTestimonials(token, { page = 1, limit = 10, status, type, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (type) q.set("type", String(type));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${programTestimonialsBase()}?${q}`, { headers: authHeader(token) });
    return {
      programTestimonials: Array.isArray(data.programTestimonials) ? data.programTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetProgramTestimonialById(token, id) {
  try {
    const { data } = await api.get(`${programTestimonialsBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.programTestimonial ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateProgramTestimonial(token, fields) {
  if (fields?.file instanceof File) {
    const fd = new FormData();
    fd.append("name", String(fields.name ?? "").trim());
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("type", String(fields.type ?? "").trim());
    fd.append("status", String(fields.status ?? "active").trim());
    fd.append("file", fields.file);
    try {
      const { data } = await api.post(programTestimonialsBase(), fd, { headers: authHeader(token) });
      return data.programTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  throw new Error("Profile image upload file is required.");
}

export async function adminUpdateProgramTestimonial(token, id, fields) {
  if (fields?.file instanceof File) {
    const fd = new FormData();
    if (fields.name !== undefined) fd.append("name", String(fields.name).trim());
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.type !== undefined) fd.append("type", String(fields.type).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status).trim());
    fd.append("file", fields.file);
    try {
      const { data } = await api.patch(`${programTestimonialsBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return data.programTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields?.name !== undefined) payload.name = String(fields.name).trim();
  if (fields?.description !== undefined) payload.description = String(fields.description).trim();
  if (fields?.type !== undefined) payload.type = String(fields.type).trim();
  if (fields?.status !== undefined) payload.status = String(fields.status).trim();

  try {
    const { data } = await api.patch(`${programTestimonialsBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.programTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteProgramTestimonial(token, id) {
  try {
    await api.delete(`${programTestimonialsBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
