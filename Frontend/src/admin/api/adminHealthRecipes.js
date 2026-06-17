import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/health-recipes";
}

function appendVideoSpecs(fd, specs) {
  fd.append("video_specification", JSON.stringify(Array.isArray(specs) ? specs : []));
}

export async function adminListHealthRecipes(token, { page = 1, limit = 50, status, type, healthConcernId, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (type) q.set("type", type);
  if (healthConcernId) q.set("healthConcernId", String(healthConcernId));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      healthRecipes: Array.isArray(body.healthRecipes) ? body.healthRecipes : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateHealthRecipe(token, fields, file) {
  const thumbnailFile = file?.thumbnailFile instanceof File ? file.thumbnailFile : file instanceof File ? file : null;
  const videoFile = file?.videoFile instanceof File ? file.videoFile : null;
  if (thumbnailFile || videoFile) {
    const fd = new FormData();
    fd.append("healthConcernId", String(fields.healthConcernId ?? "").trim());
    fd.append("title", String(fields.title ?? "").trim());
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("type", String(fields.type || "ytlink"));
    fd.append("ytLink", String(fields.ytLink ?? "").trim());
    fd.append("video", String(fields.video ?? "").trim());
    fd.append("status", String(fields.status || "active"));
    appendVideoSpecs(fd, fields.video_specification);
    if (thumbnailFile) fd.append("thumbnailFile", thumbnailFile);
    if (videoFile) fd.append("videoFile", videoFile);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.healthRecipe;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: body } = await api.post(
      base(),
      {
        healthConcernId: String(fields.healthConcernId ?? "").trim(),
        title: String(fields.title ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        thumbnail: String(fields.thumbnail ?? "").trim(),
        type: String(fields.type || "ytlink"),
        ytLink: String(fields.ytLink ?? "").trim(),
        video: String(fields.video ?? "").trim(),
        video_specification: Array.isArray(fields.video_specification) ? fields.video_specification : [],
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.healthRecipe;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateHealthRecipe(token, id, fields, file) {
  const thumbnailFile = file?.thumbnailFile instanceof File ? file.thumbnailFile : file instanceof File ? file : null;
  const videoFile = file?.videoFile instanceof File ? file.videoFile : null;
  if (thumbnailFile || videoFile) {
    const fd = new FormData();
    if (fields.healthConcernId !== undefined) fd.append("healthConcernId", String(fields.healthConcernId).trim());
    if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.type !== undefined) fd.append("type", String(fields.type));
    if (fields.ytLink !== undefined) fd.append("ytLink", String(fields.ytLink).trim());
    if (fields.video !== undefined) fd.append("video", String(fields.video).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    if (fields.video_specification !== undefined) appendVideoSpecs(fd, fields.video_specification);
    if (thumbnailFile) fd.append("thumbnailFile", thumbnailFile);
    if (videoFile) fd.append("videoFile", videoFile);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.healthRecipe;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  const payload = {};
  if (fields.healthConcernId !== undefined) payload.healthConcernId = String(fields.healthConcernId).trim();
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.thumbnail !== undefined) payload.thumbnail = String(fields.thumbnail).trim();
  if (fields.type !== undefined) payload.type = String(fields.type);
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink).trim();
  if (fields.video !== undefined) payload.video = String(fields.video).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  if (fields.video_specification !== undefined) payload.video_specification = Array.isArray(fields.video_specification) ? fields.video_specification : [];
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return body.healthRecipe;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteHealthRecipe(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetHealthRecipeById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.healthRecipe;
  } catch (error) {
    normalizeApiError(error);
  }
}
