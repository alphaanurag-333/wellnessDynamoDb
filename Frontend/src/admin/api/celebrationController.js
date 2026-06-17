import api, { authHeader, normalizeApiError } from "../../api.js";

function celebrationBase() {
  return "/admin/celebration-banners";
}

export async function adminListCelebrationBanners(token, { page = 1, limit = 10, status, type, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (type) q.set("type", type);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${celebrationBase()}?${q}`, { headers: authHeader(token) });
    return {
      celebrationBanners: Array.isArray(data.celebrationBanners) ? data.celebrationBanners : [],
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetCelebrationBannerById(token, id) {
  try {
    const { data } = await api.get(`${celebrationBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return data.celebrationBanner ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateCelebrationBanner(token, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    fd.append("title", String(fields.title ?? "").trim());
    fd.append("type", String(fields.type || "birthday"));
    fd.append("status", String(fields.status || "active"));
    if (fields.startDate !== undefined) fd.append("startDate", String(fields.startDate ?? "").trim());
    if (fields.endDate !== undefined) fd.append("endDate", String(fields.endDate ?? "").trim());
    fd.append("file", file);
    try {
      const { data } = await api.post(celebrationBase(), fd, { headers: authHeader(token) });
      return data.celebrationBanner;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  try {
    const { data } = await api.post(
      celebrationBase(),
      {
        title: String(fields.title ?? "").trim(),
        type: String(fields.type || "birthday"),
        image: String(fields.image ?? "").trim(),
        status: String(fields.status || "active"),
        startDate: String(fields.startDate ?? "").trim(),
        endDate: String(fields.endDate ?? "").trim(),
      },
      { headers: authHeader(token) }
    );
    return data.celebrationBanner;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateCelebrationBanner(token, id, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
    if (fields.type !== undefined) fd.append("type", String(fields.type));
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    if (fields.startDate !== undefined) fd.append("startDate", String(fields.startDate ?? "").trim());
    if (fields.endDate !== undefined) fd.append("endDate", String(fields.endDate ?? "").trim());
    fd.append("file", file);
    try {
      const { data } = await api.patch(`${celebrationBase()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return data.celebrationBanner;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.type !== undefined) payload.type = String(fields.type);
  if (fields.status !== undefined) payload.status = String(fields.status);
  if (fields.image !== undefined) payload.image = String(fields.image).trim();
  if (fields.startDate !== undefined) payload.startDate = String(fields.startDate ?? "").trim();
  if (fields.endDate !== undefined) payload.endDate = String(fields.endDate ?? "").trim();

  try {
    const { data } = await api.patch(`${celebrationBase()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return data.celebrationBanner;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteCelebrationBanner(token, id) {
  try {
    await api.delete(`${celebrationBase()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
