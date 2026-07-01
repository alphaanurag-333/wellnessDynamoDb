import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/test-catalog";
}

export async function adminListTestCatalog(token, { page = 1, limit = 50, status, search, category } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (category) q.set("category", category);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      tests: Array.isArray(body.tests) ? body.tests : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetTestCatalogById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.test ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateTestCatalog(token, fields) {
  try {
    const { data: body } = await api.post(base(), fields, { headers: authHeader(token) });
    return body.test;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateTestCatalog(token, id, fields) {
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fields, {
      headers: authHeader(token),
    });
    return body.test;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteTestCatalog(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
