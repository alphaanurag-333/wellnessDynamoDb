import api, { authHeader, normalizeApiError } from "../../api.js";

function specializationBase() {
  return "/admin/specializations";
}

export async function adminListSpecializations(token, { page = 1, limit = 200, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${specializationBase()}?${q}`, { headers: authHeader(token) });
    return {
      specializations: Array.isArray(data.specializations) ? data.specializations : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetSpecializationById(token, id) {
  try {
    const { data } = await api.get(`${specializationBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.specialization;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateSpecialization(token, fields) {
  try {
    const { data } = await api.post(
      specializationBase(),
      {
        title: String(fields.title ?? "").trim(),
        description:
          fields.description !== undefined && fields.description !== null
            ? String(fields.description).trim() || null
            : null,
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return data.specialization;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateSpecialization(token, id, fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.description !== undefined) {
    payload.description = String(fields.description).trim() || null;
  }
  if (fields.status !== undefined) payload.status = String(fields.status);

  try {
    const { data } = await api.patch(`${specializationBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.specialization;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteSpecialization(token, id) {
  try {
    await api.delete(`${specializationBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
