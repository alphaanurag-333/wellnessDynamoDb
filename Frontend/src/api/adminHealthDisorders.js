import api, { authHeader, normalizeApiError } from "../api.js";

function base() {
  return "/admin/health-disorders";
}

function normalizeSymptoms(symptoms) {
  if (!Array.isArray(symptoms)) return [];
  return symptoms.map((s) => String(s).trim()).filter(Boolean);
}

export async function adminListHealthDisorders(token, { page = 1, limit = 50, status, type, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (type) q.set("type", String(type));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      healthDisorders: Array.isArray(body.healthDisorders) ? body.healthDisorders : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetHealthDisorderById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.healthDisorder ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateHealthDisorder(token, fields) {
  try {
    const { data: body } = await api.post(
      base(),
      {
        title: String(fields.title ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        symptoms: normalizeSymptoms(fields.symptoms),
        type: String(fields.type || "acute").trim().toLowerCase(),
        status: String(fields.status || "active").trim().toLowerCase(),
      },
      { headers: authHeader(token) }
    );
    return body.healthDisorder;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateHealthDisorder(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.symptoms !== undefined) payload.symptoms = normalizeSymptoms(fields.symptoms);
  if (fields.type !== undefined) payload.type = String(fields.type).trim().toLowerCase();
  if (fields.status !== undefined) payload.status = String(fields.status).trim().toLowerCase();

  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.healthDisorder;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteHealthDisorder(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
