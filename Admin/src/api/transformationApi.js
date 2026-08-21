import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { pointsToPayload } from "../data/testimonialDropdownData.js";

const BASE = "/admin/transformations";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapTransformation(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  return {
    id,
    name: String(row.name || "").trim(),
    description: String(row.description || "").trim(),
    achievements: String(row.achievements || "").trim(),
    timeTaken: Number.isFinite(Number(row.timeTaken)) ? Number(row.timeTaken) : 1,
    inchesLost: row.inchesLost == null || row.inchesLost === "" ? null : Number(row.inchesLost),
    oldImage: row.oldImage || "",
    newImage: row.newImage || "",
    dataPoints: Array.isArray(row.dataPoints) ? row.dataPoints : [],
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
  if (fields.description !== undefined) form.append("description", String(fields.description || "").trim());
  if (fields.achievements !== undefined) form.append("achievements", String(fields.achievements || "").trim());
  if (fields.timeTaken !== undefined) form.append("timeTaken", String(fields.timeTaken));
  if (fields.inchesLost !== undefined) {
    form.append("inchesLost", fields.inchesLost == null ? "" : String(fields.inchesLost));
  }
  if (fields.order !== undefined) form.append("order", String(fields.order));
  if (fields.dataPoints !== undefined) {
    form.append("dataPoints", JSON.stringify(pointsToPayload(fields.dataPoints)));
  }
  if (fields.status !== undefined) form.append("status", String(fields.status));
  else if (fields.live !== undefined) form.append("status", fields.live ? "active" : "inactive");
  if (fields.webVisible !== undefined) form.append("webVisible", String(Boolean(fields.webVisible)));
  if (fields.appVisible !== undefined) form.append("appVisible", String(Boolean(fields.appVisible)));
}

function jsonFields(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name || "").trim();
  if (fields.description !== undefined) payload.description = String(fields.description || "").trim();
  if (fields.achievements !== undefined) payload.achievements = String(fields.achievements || "").trim();
  if (fields.timeTaken !== undefined) payload.timeTaken = fields.timeTaken;
  if (fields.inchesLost !== undefined) payload.inchesLost = fields.inchesLost;
  if (fields.order !== undefined) payload.order = fields.order;
  if (fields.dataPoints !== undefined) payload.dataPoints = pointsToPayload(fields.dataPoints);
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  if (fields.webVisible !== undefined) payload.webVisible = Boolean(fields.webVisible);
  if (fields.appVisible !== undefined) payload.appVisible = Boolean(fields.appVisible);
  return payload;
}

export async function adminListTransformations(token, { page = 1, limit = 20, status, search } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.transformations) ? data.transformations : [])
      .map(mapTransformation)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateTransformation(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const form = new FormData();
    appendFields(form, fields);
    if (files.oldImage instanceof File) form.append("oldImage", files.oldImage);
    if (files.newImage instanceof File) form.append("newImage", files.newImage);
    const { data } = await api.post(BASE, form, { headers });
    return mapTransformation(data.transformation);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateTransformation(token, id, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const hasFiles = files.oldImage instanceof File || files.newImage instanceof File;
    let payload = jsonFields(fields);
    if (hasFiles) {
      payload = new FormData();
      appendFields(payload, fields);
      if (files.oldImage instanceof File) payload.append("oldImage", files.oldImage);
      if (files.newImage instanceof File) payload.append("newImage", files.newImage);
    }
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, { headers });
    return mapTransformation(data.transformation);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteTransformation(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
