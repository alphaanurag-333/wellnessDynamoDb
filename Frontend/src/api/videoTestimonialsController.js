import api, { authHeader, normalizeApiError } from "../api.js";

function videoTestimonialsBase() {
  return "/admin/video-testimonials";
}

export async function adminListVideoTestimonials(token, { page = 1, limit = 10, type, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (type) q.set("type", String(type));
  if (status) q.set("status", String(status));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${videoTestimonialsBase()}?${q}`, { headers: authHeader(token) });
    return {
      videoTestimonials: Array.isArray(data.videoTestimonials) ? data.videoTestimonials : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateVideoTestimonial(token, fields) {
  const normalizedType = String(fields?.type || "link").trim().toLowerCase();
  if (fields?.profileImageFile instanceof File || (normalizedType === "video" && fields?.videoFile instanceof File)) {
    const fd = new FormData();
    fd.append("name", String(fields.name ?? "").trim());
    fd.append("type", normalizedType);
    if (fields?.status !== undefined) fd.append("status", String(fields.status).trim());
    if (normalizedType === "link") {
      fd.append("ytLink", String(fields.ytLink ?? "").trim());
    }
    if (fields.profileImageFile instanceof File) fd.append("profileImage", fields.profileImageFile);
    if (normalizedType === "video" && fields.videoFile instanceof File) fd.append("videoFile", fields.videoFile);
    try {
      const { data } = await api.post(videoTestimonialsBase(), fd, { headers: authHeader(token) });
      return data.videoTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {
    name: String(fields?.name ?? "").trim(),
    type: normalizedType,
    ...(fields?.status !== undefined ? { status: String(fields.status).trim() } : {}),
    ...(normalizedType === "link" ? { ytLink: String(fields?.ytLink ?? "").trim() } : {}),
  };

  try {
    const { data } = await api.post(videoTestimonialsBase(), payload, { headers: authHeader(token) });
    return data.videoTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateVideoTestimonial(token, id, fields) {
  const normalizedType = fields?.type !== undefined ? String(fields.type).trim().toLowerCase() : undefined;
  if (fields?.profileImageFile instanceof File || (normalizedType === "video" || normalizedType === undefined) && fields?.videoFile instanceof File) {
    const fd = new FormData();
    if (fields.name !== undefined) fd.append("name", String(fields.name).trim());
    if (normalizedType !== undefined) fd.append("type", normalizedType);
    if (normalizedType === "link" && fields.ytLink !== undefined) fd.append("ytLink", String(fields.ytLink ?? "").trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status).trim());
    if (fields.profileImageFile instanceof File) fd.append("profileImage", fields.profileImageFile);
    if (fields.videoFile instanceof File) fd.append("videoFile", fields.videoFile);
    try {
      const { data } = await api.patch(`${videoTestimonialsBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return data.videoTestimonial;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields?.name !== undefined) payload.name = String(fields.name).trim();
  if (normalizedType !== undefined) payload.type = normalizedType;
  if (fields?.status !== undefined) payload.status = String(fields.status).trim();
  if (normalizedType === "link" && fields?.ytLink !== undefined) payload.ytLink = String(fields.ytLink ?? "").trim();

  try {
    const { data } = await api.patch(`${videoTestimonialsBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return data.videoTestimonial;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteVideoTestimonial(token, id) {
  try {
    await api.delete(`${videoTestimonialsBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
