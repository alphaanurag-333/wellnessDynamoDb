import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

function base() {
  return "/assistant/real-people-testimonials";
}

export async function assistantListRealPeopleTestimonials(token, { page = 1, limit = 20, status, approvalStatus, search } = {}) {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) q.set("status", status);
  if (approvalStatus) q.set("approvalStatus", approvalStatus);
  if (search?.trim()) q.set("search", search.trim());
  try {
    const { data } = await assistantApi.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      realPeopleTestimonials: Array.isArray(data.realPeopleTestimonials) ? data.realPeopleTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantListPendingRealPeopleTestimonials(token) {
  try {
    const { data } = await assistantApi.get(`${base()}/pending`, { headers: authHeader(token) });
    return Array.isArray(data.realPeopleTestimonials) ? data.realPeopleTestimonials : [];
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantReviewRealPeopleTestimonial(token, id, { action, rejectionReason } = {}) {
  try {
    const { data } = await assistantApi.patch(
      `${base()}/${encodeURIComponent(id)}/review`,
      { action, rejectionReason },
      { headers: authHeader(token) }
    );
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateRealPeopleTestimonial(token, id, fields) {
  const payload = {};
  if (fields.heading !== undefined) payload.heading = String(fields.heading).trim();
  if (fields.content !== undefined) payload.content = String(fields.content).trim();
  if (fields.userName !== undefined) payload.userName = String(fields.userName).trim();
  if (fields.rating !== undefined) payload.rating = Number(fields.rating);
  if (fields.memberSinceYear !== undefined) payload.memberSinceYear = Number(fields.memberSinceYear);
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data } = await assistantApi.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return data.realPeopleTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantDeleteRealPeopleTestimonial(token, id) {
  try {
    await assistantApi.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
