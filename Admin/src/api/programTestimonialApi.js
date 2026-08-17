import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/program-testimonials";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapProgramTestimonial(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    name: String(row.name || "").trim(),
    description: String(row.description || "").trim(),
    program: String(row.type || "").trim(),
    programLabel: String(row.typeLabel || "").trim(),
    profileImage: row.profileImage || "",
    hasPhoto: Boolean(row.profileImage),
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function adminListProgramTestimonials(
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
    const items = (Array.isArray(data.programTestimonials) ? data.programTestimonials : [])
      .map(mapProgramTestimonial)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

function appendFields(form, fields) {
  if (fields.name !== undefined) form.append("name", String(fields.name || "").trim());
  if (fields.description !== undefined) {
    form.append("description", String(fields.description || "").trim());
  }
  if (fields.type !== undefined) form.append("type", String(fields.type || "").trim());
  if (fields.status !== undefined) form.append("status", String(fields.status));
  else if (fields.live !== undefined) {
    form.append("status", fields.live ? "active" : "inactive");
  }
}

function jsonFields(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name || "").trim();
  if (fields.description !== undefined) {
    payload.description = String(fields.description || "").trim();
  }
  if (fields.type !== undefined) payload.type = String(fields.type || "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

export async function adminCreateProgramTestimonial(token, fields, file) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const form = new FormData();
    appendFields(form, fields);
    form.append("file", file);
    const { data } = await api.post(BASE, form, { headers });
    return mapProgramTestimonial(data.programTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateProgramTestimonial(token, id, fields, file) {
  const headers = authHeader(tokenOrStored(token));
  try {
    let payload = jsonFields(fields);
    if (file instanceof File) {
      payload = new FormData();
      appendFields(payload, fields);
      payload.append("file", file);
    }
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, { headers });
    return mapProgramTestimonial(data.programTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteProgramTestimonial(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
