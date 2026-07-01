import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/diet-plan-catalog";
}

export async function adminListDietPlanCatalog(token, { page = 1, limit = 10, status, search, category, type } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (category) q.set("category", category);
  if (type) q.set("type", type);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      plans: Array.isArray(body.plans) ? body.plans : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetDietPlanCatalogById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.plan ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateDietPlanCatalog(token, fields) {
  try {
    const { data: body } = await api.post(base(), fields, { headers: authHeader(token) });
    return body.plan;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateDietPlanCatalog(token, id, fields) {
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fields, {
      headers: authHeader(token),
    });
    return body.plan;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteDietPlanCatalog(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
