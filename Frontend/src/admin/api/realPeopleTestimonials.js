import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/real-people-testimonials";
}

export async function adminListRealPeopleTestimonials(
  token,
  { page = 1, limit = 10, status, approvalStatus, search } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (approvalStatus) q.set("approvalStatus", approvalStatus);
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
  try {
    const { data } = await api.post(
      base(),
      {
        userId: String(fields.userId ?? "").trim(),
        review: String(fields.review ?? "").trim(),
        stars: Number(fields.stars),
        status: String(fields.status || "active"),
        approvalStatus: String(fields.approvalStatus || "approved"),
      },
      { headers: authHeader(token) }
    );
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateRealPeopleTestimonial(token, id, fields) {
  const payload = {};
  if (fields?.userId !== undefined) payload.userId = String(fields.userId).trim();
  if (fields?.review !== undefined) payload.review = String(fields.review).trim();
  if (fields?.stars !== undefined) payload.stars = Number(fields.stars);
  if (fields?.status !== undefined) payload.status = String(fields.status);
  if (fields?.approvalStatus !== undefined) payload.approvalStatus = String(fields.approvalStatus);

  try {
    const { data } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminReviewRealPeopleTestimonial(token, id, { action, rejectionReason } = {}) {
  try {
    const { data } = await api.patch(
      `${base()}/${encodeURIComponent(id)}/review`,
      { action, rejectionReason },
      { headers: authHeader(token) }
    );
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
