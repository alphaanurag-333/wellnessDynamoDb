import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/physical-exercises";
}

export async function adminListPhysicalExercises(token, { page = 1, limit = 50, status, type, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", String(status));
  if (type) q.set("type", String(type));
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      physicalExercises: Array.isArray(body.physicalExercises) ? body.physicalExercises : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetPhysicalExerciseById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.physicalExercise ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreatePhysicalExercise(token, fields, file) {
  const videoFile = file?.videoFile instanceof File ? file.videoFile : file instanceof File ? file : null;

  if (videoFile) {
    const fd = new FormData();
    fd.append("title", String(fields.title ?? "").trim());
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("type", String(fields.type || "ytlink"));
    fd.append("link", String(fields.link ?? "").trim());
    fd.append("status", String(fields.status || "active"));
    fd.append("videoFile", videoFile);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.physicalExercise;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  try {
    const { data: body } = await api.post(
      base(),
      {
        title: String(fields.title ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        type: String(fields.type || "ytlink"),
        link: String(fields.link ?? "").trim(),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.physicalExercise;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdatePhysicalExercise(token, id, fields, file) {
  const videoFile = file?.videoFile instanceof File ? file.videoFile : file instanceof File ? file : null;

  if (videoFile) {
    const fd = new FormData();
    if (fields.title !== undefined) fd.append("title", String(fields.title).trim());
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.type !== undefined) fd.append("type", String(fields.type));
    if (fields.link !== undefined) fd.append("link", String(fields.link).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    fd.append("videoFile", videoFile);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.physicalExercise;
    } catch (error) {
      normalizeApiError(error);
    }
  }

  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.type !== undefined) payload.type = String(fields.type);
  if (fields.link !== undefined) payload.link = String(fields.link).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);

  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.physicalExercise;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeletePhysicalExercise(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
