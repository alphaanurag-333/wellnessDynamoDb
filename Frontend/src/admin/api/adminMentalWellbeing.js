import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/mental-wellbeing";
}

export async function adminListMentalWellbeing(token, { page = 1, limit = 50, status, type, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (type) q.set("type", String(type));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      items: Array.isArray(body.items) ? body.items : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetMentalWellbeingById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.item ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateMentalWellbeing(token, fields, file) {
  const mediaFile = file instanceof File ? file : null;
  if (mediaFile) {
    const fd = new FormData();
    fd.append("title", String(fields.title ?? "").trim());
    fd.append("type", String(fields.type || "ytlink"));
    fd.append("ytLink", String(fields.ytLink ?? "").trim());
    fd.append("status", String(fields.status || "active"));
    fd.append("file", mediaFile);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.item;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: body } = await api.post(
      base(),
      {
        title: String(fields.title ?? "").trim(),
        type: String(fields.type || "ytlink"),
        ytLink: String(fields.ytLink ?? "").trim(),
        file: String(fields.file ?? "").trim(),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.item;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMentalWellbeing(token, id, fields, file) {
  const mediaFile = file instanceof File ? file : null;
  if (mediaFile) {
    const fd = new FormData();
    if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
    if (fields.type !== undefined) fd.append("type", String(fields.type));
    if (fields.ytLink !== undefined) fd.append("ytLink", String(fields.ytLink).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    fd.append("file", mediaFile);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.item;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.type !== undefined) payload.type = String(fields.type);
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink).trim();
  if (fields.file !== undefined) payload.file = String(fields.file).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return body.item;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteMentalWellbeing(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
