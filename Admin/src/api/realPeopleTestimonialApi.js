import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { pointsToPayload } from "../data/testimonialDropdownData.js";

const BASE = "/admin/real-people-testimonials";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapRealPeopleTestimonial(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const stars = Number(row.stars ?? row.rating);
  return {
    id,
    name: String(row.name || "").trim(),
    review: String(row.review || row.content || "").trim(),
    stars: Number.isFinite(stars) ? stars : 5,
    healthConcernId: String(row.healthConcernId || "").trim(),
    healthConcernTitle: String(row.healthConcernTitle || row.heading || "").trim(),
    profileImage: row.profileImage || "",
    dataPoints: Array.isArray(row.dataPoints) ? row.dataPoints : [],
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
  if (fields.review !== undefined) form.append("review", String(fields.review || "").trim());
  if (fields.stars !== undefined) form.append("stars", String(fields.stars));
  if (fields.healthConcernId !== undefined) {
    form.append("healthConcernId", String(fields.healthConcernId || "").trim());
  }
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
  if (fields.review !== undefined) payload.review = String(fields.review || "").trim();
  if (fields.stars !== undefined) payload.stars = fields.stars;
  if (fields.healthConcernId !== undefined) payload.healthConcernId = String(fields.healthConcernId || "").trim();
  if (fields.dataPoints !== undefined) payload.dataPoints = pointsToPayload(fields.dataPoints);
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  if (fields.webVisible !== undefined) payload.webVisible = Boolean(fields.webVisible);
  if (fields.appVisible !== undefined) payload.appVisible = Boolean(fields.appVisible);
  return payload;
}

export async function adminListRealPeopleTestimonials(
  token,
  { page = 1, limit = 20, status, search, healthConcernId } = {},
) {
  const params = { page, limit };
  if (status) params.status = status;
  if (healthConcernId) params.healthConcernId = healthConcernId;
  if (String(search || "").trim()) params.search = String(search).trim();
  try {
    const { data } = await api.get(BASE, {
      params,
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.realPeopleTestimonials) ? data.realPeopleTestimonials : [])
      .map(mapRealPeopleTestimonial)
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination || { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateRealPeopleTestimonial(token, fields, file) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const form = new FormData();
    appendFields(form, fields);
    form.append("file", file);
    const { data } = await api.post(BASE, form, { headers });
    return mapRealPeopleTestimonial(data.realPeopleTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateRealPeopleTestimonial(token, id, fields, file) {
  const headers = authHeader(tokenOrStored(token));
  try {
    let payload = jsonFields(fields);
    if (file instanceof File) {
      payload = new FormData();
      appendFields(payload, fields);
      payload.append("file", file);
    }
    const { data } = await api.patch(`${BASE}/${encodeURIComponent(id)}`, payload, { headers });
    return mapRealPeopleTestimonial(data.realPeopleTestimonial);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteRealPeopleTestimonial(token, id) {
  try {
    await api.delete(`${BASE}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
