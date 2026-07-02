import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/wellness-prescriptions";
}

export async function adminListWellnessPrescriptionCatalog(
  token,
  { page = 1, limit = 50, status, search, category } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (category) q.set("category", category);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      prescriptions: Array.isArray(body.prescriptions) ? body.prescriptions : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetWellnessPrescriptionCatalogById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return body.prescription ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateWellnessPrescriptionCatalog(token, fields) {
  try {
    const { data: body } = await api.post(base(), fields, { headers: authHeader(token) });
    return body.prescription;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateWellnessPrescriptionCatalog(token, id, fields) {
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fields, {
      headers: authHeader(token),
    });
    return body.prescription;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteWellnessPrescriptionCatalog(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
