import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/prakruti-recommendations";
}

export async function adminListPrakrutiRecommendations(token, { page = 1, limit = 50, status, search, prakrutiType } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (prakrutiType) q.set("prakrutiType", prakrutiType);
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      recommendations: Array.isArray(body.recommendations) ? body.recommendations : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetPrakrutiRecommendationById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.recommendation ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreatePrakrutiRecommendation(token, fields) {
  try {
    const { data: body } = await api.post(
      base(),
      {
        prakrutiType: String(fields.prakrutiType ?? "").trim(),
        title: String(fields.title ?? "").trim(),
        sortOrder: Number(fields.sortOrder) || 0,
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.recommendation;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdatePrakrutiRecommendation(token, id, fields) {
  const payload = {};
  if (fields.prakrutiType !== undefined) payload.prakrutiType = String(fields.prakrutiType).trim();
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.sortOrder !== undefined) payload.sortOrder = Number(fields.sortOrder) || 0;
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.recommendation;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeletePrakrutiRecommendation(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
