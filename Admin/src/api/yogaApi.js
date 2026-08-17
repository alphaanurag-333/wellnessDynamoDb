import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { mapYoga } from "../data/yogaConfigData.js";

function yogaBase() {
  return "/admin/yoga";
}

function tokenOrStored(token) {
  return token || getAccountToken();
}

function appendFields(fd, fields) {
  if (fields.category !== undefined) fd.append("category", String(fields.category ?? "").trim());
  if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
  if (fields.description !== undefined) fd.append("description", String(fields.description ?? "").trim());
  if (fields.type !== undefined) fd.append("type", String(fields.type || "ytlink"));
  if (fields.ytLink !== undefined) fd.append("ytLink", String(fields.ytLink ?? "").trim());
  if (fields.video !== undefined) fd.append("video", String(fields.video ?? "").trim());
  if (fields.status !== undefined) fd.append("status", String(fields.status));
  else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
}

function fieldsToPayload(fields) {
  const payload = {};
  if (fields.category !== undefined) payload.category = String(fields.category ?? "").trim();
  if (fields.title !== undefined) payload.title = String(fields.title ?? "").trim();
  if (fields.description !== undefined) payload.description = String(fields.description ?? "").trim();
  if (fields.type !== undefined) payload.type = String(fields.type || "ytlink");
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink ?? "").trim();
  if (fields.video !== undefined) payload.video = String(fields.video ?? "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

export async function adminListYoga(token, { page = 1, limit = 20, status, type, category, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (type) q.set("type", type);
  if (category) q.set("category", String(category));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${yogaBase()}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.yoga) ? data.yoga : [])
      .map((row) => mapYoga(row))
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination ?? { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateYoga(token, fields, files = {}) {
  const thumbnailFile = files.thumbnailFile instanceof File ? files.thumbnailFile : null;
  const videoFile = files.videoFile instanceof File ? files.videoFile : null;
  const headers = authHeader(tokenOrStored(token));
  const payload = {
    category: fields.category ?? "",
    title: fields.title ?? "",
    description: fields.description ?? "",
    type: fields.type || "ytlink",
    ytLink: fields.ytLink ?? "",
    video: fields.video ?? "",
    status: fields.status || (fields.live === false ? "inactive" : "active"),
  };
  try {
    if (thumbnailFile || videoFile) {
      const fd = new FormData();
      appendFields(fd, payload);
      if (thumbnailFile) fd.append("thumbnailFile", thumbnailFile);
      if (videoFile) fd.append("videoFile", videoFile);
      const { data } = await api.post(yogaBase(), fd, { headers });
      return mapYoga(data.yoga);
    }
    const { data } = await api.post(yogaBase(), payload, { headers });
    return mapYoga(data.yoga);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateYoga(token, id, fields, files = {}) {
  const thumbnailFile = files.thumbnailFile instanceof File ? files.thumbnailFile : null;
  const videoFile = files.videoFile instanceof File ? files.videoFile : null;
  const headers = authHeader(tokenOrStored(token));
  try {
    if (thumbnailFile || videoFile) {
      const fd = new FormData();
      appendFields(fd, fields);
      if (thumbnailFile) fd.append("thumbnailFile", thumbnailFile);
      if (videoFile) fd.append("videoFile", videoFile);
      const { data } = await api.patch(`${yogaBase()}/${encodeURIComponent(id)}`, fd, { headers });
      return mapYoga(data.yoga);
    }
    const { data } = await api.patch(`${yogaBase()}/${encodeURIComponent(id)}`, fieldsToPayload(fields), {
      headers,
    });
    return mapYoga(data.yoga);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteYoga(token, id) {
  try {
    await api.delete(`${yogaBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
