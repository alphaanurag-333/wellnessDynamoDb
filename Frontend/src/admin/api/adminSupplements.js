import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/supplements";
}

export async function adminListSupplements(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      supplements: Array.isArray(body.supplements) ? body.supplements : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetSupplementById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.supplement ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateSupplement(token, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    fd.append("name", String(fields.name ?? "").trim());
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("packSize", String(fields.packSize ?? ""));
    fd.append("unit", String(fields.unit ?? "").trim());
    fd.append("price", String(fields.price ?? ""));
    fd.append("status", String(fields.status || "active"));
    fd.append("file", file);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.supplement;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: body } = await api.post(
      base(),
      {
        name: String(fields.name ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        packSize: String(fields.packSize ?? ""),
        unit: String(fields.unit ?? "").trim(),
        price: String(fields.price ?? ""),
        image: String(fields.image ?? "").trim(),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.supplement;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateSupplement(token, id, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    if (fields.name !== undefined) fd.append("name", String(fields.name).trim());
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.packSize !== undefined) fd.append("packSize", String(fields.packSize));
    if (fields.unit !== undefined) fd.append("unit", String(fields.unit).trim());
    if (fields.price !== undefined) fd.append("price", String(fields.price));
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    fd.append("file", file);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.supplement;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.packSize !== undefined) payload.packSize = String(fields.packSize);
  if (fields.unit !== undefined) payload.unit = String(fields.unit).trim();
  if (fields.price !== undefined) payload.price = String(fields.price);
  if (fields.status !== undefined) payload.status = String(fields.status);
  if (fields.image !== undefined) payload.image = String(fields.image).trim();
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return body.supplement;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteSupplement(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
