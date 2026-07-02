import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/yoga";
}

export async function adminListYoga(token, { page = 1, limit = 50, status, type, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (type) q.set("type", String(type));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      yoga: Array.isArray(body.yoga) ? body.yoga : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetYogaById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.yoga ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateYoga(token, fields, file) {
  const thumbnailFile = file?.thumbnailFile instanceof File ? file.thumbnailFile : file instanceof File ? file : null;
  const videoFile = file?.videoFile instanceof File ? file.videoFile : null;

  if (thumbnailFile || videoFile) {
    const fd = new FormData();
    fd.append("title", String(fields.title ?? "").trim());
    fd.append("type", String(fields.type || "ytlink"));
    fd.append("ytLink", String(fields.ytLink ?? fields.ytlink ?? "").trim());
    fd.append("video", String(fields.video ?? "").trim());
    fd.append("status", String(fields.status || "active"));
    if (thumbnailFile) fd.append("thumbnailFile", thumbnailFile);
    if (videoFile) fd.append("videoFile", videoFile);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.yoga;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  try {
    const { data: body } = await api.post(
      base(),
      {
        title: String(fields.title ?? "").trim(),
        thumbnail: String(fields.thumbnail ?? "").trim(),
        type: String(fields.type || "ytlink"),
        ytLink: String(fields.ytLink ?? fields.ytlink ?? "").trim(),
        video: String(fields.video ?? "").trim(),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.yoga;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateYoga(token, id, fields, file) {
  const thumbnailFile = file?.thumbnailFile instanceof File ? file.thumbnailFile : file instanceof File ? file : null;
  const videoFile = file?.videoFile instanceof File ? file.videoFile : null;

  if (thumbnailFile || videoFile) {
    const fd = new FormData();
    if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
    if (fields.type !== undefined) fd.append("type", String(fields.type));
    if (fields.ytLink !== undefined) fd.append("ytLink", String(fields.ytLink).trim());
    if (fields.ytlink !== undefined) fd.append("ytLink", String(fields.ytlink).trim());
    if (fields.video !== undefined) fd.append("video", String(fields.video).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    if (thumbnailFile) fd.append("thumbnailFile", thumbnailFile);
    if (videoFile) fd.append("videoFile", videoFile);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.yoga;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.thumbnail !== undefined) payload.thumbnail = String(fields.thumbnail).trim();
  if (fields.type !== undefined) payload.type = String(fields.type);
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink).trim();
  if (fields.ytlink !== undefined) payload.ytLink = String(fields.ytlink).trim();
  if (fields.video !== undefined) payload.video = String(fields.video).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);

  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.yoga;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteYoga(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
