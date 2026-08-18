import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/video-testimonials";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapVideoTestimonial(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const type = String(row.type || "link").toLowerCase() === "video" ? "video" : "link";
  return {
    id,
    name: String(row.name || "").trim(),
    title: String(row.name || "").trim(),
    profileImage: row.profileImage || "",
    ytLink: String(row.ytLink || "").trim(),
    video: row.video || "",
    type,
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function appendFields(form, fields) {
  if (fields.name !== undefined) form.append("name", String(fields.name || "").trim());
  if (fields.ytLink !== undefined) form.append("ytLink", String(fields.ytLink || "").trim());
  if (fields.type !== undefined) form.append("type", String(fields.type || "link"));
  if (fields.status !== undefined) form.append("status", String(fields.status));
  else if (fields.live !== undefined) form.append("status", fields.live ? "active" : "inactive");
}

function jsonFields(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name || "").trim();
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink || "").trim();
  if (fields.type !== undefined) payload.type = String(fields.type || "link");
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

export async function adminListVideoTestimonials(
  token,
  { page = 1, limit = 20, status, type, search } = {},
) {
  const params = { page, limit };
  if (status) params.status = status;
  if (type) params.type = type;
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.videoTestimonials) ? data.videoTestimonials : [])
      .map(mapVideoTestimonial)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateVideoTestimonial(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const form = new FormData();
    appendFields(form, fields);
    if (files.profileImage instanceof File) form.append("profileImage", files.profileImage);
    if (files.videoFile instanceof File) form.append("videoFile", files.videoFile);
    const { data } = await api.post(BASE, form, { headers });
    return mapVideoTestimonial(data.videoTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateVideoTestimonial(token, id, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const hasFiles = files.profileImage instanceof File || files.videoFile instanceof File;
    let payload = jsonFields(fields);
    if (hasFiles) {
      payload = new FormData();
      appendFields(payload, fields);
      if (files.profileImage instanceof File) payload.append("profileImage", files.profileImage);
      if (files.videoFile instanceof File) payload.append("videoFile", files.videoFile);
    }
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, { headers });
    return mapVideoTestimonial(data.videoTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteVideoTestimonial(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
