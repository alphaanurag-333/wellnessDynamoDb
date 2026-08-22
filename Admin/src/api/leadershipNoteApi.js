import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/leadership-notes";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapLeadershipNote(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    name: String(row.name || "").trim(),
    designation: String(row.designation || "").trim(),
    title: String(row.title || "").trim(),
    badge: String(row.badge || "").trim(),
    message: String(row.message || "").trim(),
    profileImage: row.profileImage || "",
    order: Number.isFinite(Number(row.order)) ? Number(row.order) : 0,
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    webVisible: row.webVisible !== false,
    appVisible: row.appVisible !== false,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function appendFields(form, fields) {
  if (fields.name !== undefined) form.append("name", String(fields.name || "").trim());
  if (fields.designation !== undefined) form.append("designation", String(fields.designation || "").trim());
  if (fields.title !== undefined) form.append("title", String(fields.title || "").trim());
  if (fields.badge !== undefined) form.append("badge", String(fields.badge || "").trim());
  if (fields.message !== undefined) form.append("message", String(fields.message || "").trim());
  if (fields.order !== undefined) form.append("order", String(fields.order));
  if (fields.status !== undefined) form.append("status", String(fields.status));
  else if (fields.live !== undefined) form.append("status", fields.live ? "active" : "inactive");
  if (fields.webVisible !== undefined) form.append("webVisible", String(Boolean(fields.webVisible)));
  if (fields.appVisible !== undefined) form.append("appVisible", String(Boolean(fields.appVisible)));
}

function jsonFields(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name || "").trim();
  if (fields.designation !== undefined) payload.designation = String(fields.designation || "").trim();
  if (fields.title !== undefined) payload.title = String(fields.title || "").trim();
  if (fields.badge !== undefined) payload.badge = String(fields.badge || "").trim();
  if (fields.message !== undefined) payload.message = String(fields.message || "").trim();
  if (fields.order !== undefined) payload.order = fields.order;
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  if (fields.webVisible !== undefined) payload.webVisible = Boolean(fields.webVisible);
  if (fields.appVisible !== undefined) payload.appVisible = Boolean(fields.appVisible);
  return payload;
}

export async function adminListLeadershipNotes(token, { page = 1, limit = 20, status, search } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.leadershipNotes) ? data.leadershipNotes : [])
      .map(mapLeadershipNote)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateLeadershipNote(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const form = new FormData();
    appendFields(form, fields);
    const photo = files.profileImage instanceof File ? files.profileImage : files.file instanceof File ? files.file : null;
    if (photo) form.append("file", photo);
    const { data } = await api.post(BASE, form, { headers });
    return mapLeadershipNote(data.leadershipNote);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateLeadershipNote(token, id, fields = {}, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const photo = files.profileImage instanceof File ? files.profileImage : files.file instanceof File ? files.file : null;
    let payload = jsonFields(fields);
    if (photo) {
      payload = new FormData();
      appendFields(payload, fields);
      payload.append("file", photo);
    }
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, { headers });
    return mapLeadershipNote(data.leadershipNote);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteLeadershipNote(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
