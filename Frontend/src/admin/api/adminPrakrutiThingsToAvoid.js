import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/prakruti-things-to-avoid";
}

export async function adminListPrakrutiThingsToAvoid(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      thingsToAvoid: Array.isArray(body.thingsToAvoid) ? body.thingsToAvoid : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetPrakrutiThingToAvoidById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.thingToAvoid ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreatePrakrutiThingToAvoid(token, fields) {
  try {
    const { data: body } = await api.post(
      base(),
      {
        title: String(fields.title ?? "").trim(),
        sortOrder: Number(fields.sortOrder) || 0,
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.thingToAvoid;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdatePrakrutiThingToAvoid(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = Number(fields.sortOrder) || 0;
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.thingToAvoid;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeletePrakrutiThingToAvoid(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
