import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/real-people-testimonials";
}

export async function adminListRealPeopleTestimonials(
  token,
  { page = 1, limit = 10, status, search, healthConcernId } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (healthConcernId) q.set("healthConcernId", String(healthConcernId));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      realPeopleTestimonials: Array.isArray(data.realPeopleTestimonials) ? data.realPeopleTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetRealPeopleTestimonialById(token, id) {
  try {
    const { data } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return data.realPeopleTestimonial ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateRealPeopleTestimonial(token, fields) {
  if (!(fields?.file instanceof File)) {
    throw new Error("Profile image upload file is required.");
  }

  const fd = new FormData();
  fd.append("name", String(fields.name ?? "").trim());
  fd.append("stars", String(fields.stars ?? fields.rating ?? ""));
  fd.append("review", String(fields.review ?? "").trim());
  fd.append("healthConcernId", String(fields.healthConcernId ?? "").trim());
  fd.append("status", String(fields.status ?? "active").trim());
  fd.append("file", fields.file);

  try {
    const { data } = await api.post(base(), fd, { headers: authHeader(token) });
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateRealPeopleTestimonial(token, id, fields) {
  if (fields?.file instanceof File) {
    const fd = new FormData();
    if (fields.name !== undefined) fd.append("name", String(fields.name).trim());
    if (fields.stars !== undefined || fields.rating !== undefined) {
      fd.append("stars", String(fields.stars ?? fields.rating));
    }
    if (fields.review !== undefined) fd.append("review", String(fields.review).trim());
    if (fields.healthConcernId !== undefined) {
      fd.append("healthConcernId", String(fields.healthConcernId).trim());
    }
    if (fields.status !== undefined) fd.append("status", String(fields.status).trim());
    fd.append("file", fields.file);
    try {
      const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return data.realPeopleTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields?.name !== undefined) payload.name = String(fields.name).trim();
  if (fields?.stars !== undefined || fields?.rating !== undefined) {
    payload.stars = Number(fields.stars ?? fields.rating);
  }
  if (fields?.review !== undefined) payload.review = String(fields.review).trim();
  if (fields?.healthConcernId !== undefined) {
    payload.healthConcernId = String(fields.healthConcernId).trim();
  }
  if (fields?.status !== undefined) payload.status = String(fields.status).trim();

  try {
    const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteRealPeopleTestimonial(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
