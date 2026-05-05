import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/admin/health-concerns";
}

export async function adminListHealthConcerns(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      healthConcerns: Array.isArray(body.healthConcerns) ? body.healthConcerns : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetHealthConcernById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.healthConcern ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateHealthConcern(token, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    fd.append("title", String(fields.title ?? "").trim());
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("status", String(fields.status || "active"));
    fd.append("file", file);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.healthConcern;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: body } = await api.post(
      base(),
      {
        title: String(fields.title ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        icon: String(fields.icon ?? "").trim(),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.healthConcern;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateHealthConcern(token, id, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    fd.append("file", file);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.healthConcern;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.icon !== undefined) payload.icon = String(fields.icon).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return body.healthConcern;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteHealthConcern(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
