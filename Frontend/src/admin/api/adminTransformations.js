import api, { authHeader, normalizeApiError } from "../../api.js";

function base() {
  return "/admin/transformations";
}

export async function adminListTransformations(token, { page = 1, limit = 50, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${base()}?${q}`, { headers: authHeader(token) });
    return {
      transformations: Array.isArray(body.transformations) ? body.transformations : [],
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetTransformationById(token, id) {
  try {
    const { data: body } = await api.get(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
    return body.transformation ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateTransformation(token, fields, oldFile, newFile) {
  if (oldFile instanceof File && newFile instanceof File) {
    const fd = new FormData();
    fd.append("name", String(fields.name ?? "").trim());
    fd.append("timeTaken", String(fields.timeTaken ?? ""));
    fd.append("inchesLost", String(fields.inchesLost ?? ""));
    fd.append("order", String(fields.order ?? "0"));
    fd.append("achievements", String(fields.achievements ?? "").trim());
    fd.append("description", String(fields.description ?? "").trim());
    fd.append("status", String(fields.status || "active"));
    fd.append("oldImage", oldFile);
    fd.append("newImage", newFile);
    try {
      const { data: body } = await api.post(base(), fd, { headers: authHeader(token) });
      return body.transformation;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: body } = await api.post(
      base(),
      {
        name: String(fields.name ?? "").trim(),
        timeTaken: Number(fields.timeTaken),
        inchesLost: Number(fields.inchesLost),
        order: Number(fields.order ?? 0),
        achievements: String(fields.achievements ?? "").trim(),
        description: String(fields.description ?? "").trim(),
        oldImage: String(fields.oldImage ?? "").trim(),
        newImage: String(fields.newImage ?? "").trim(),
        status: String(fields.status || "active"),
      },
      { headers: authHeader(token) }
    );
    return body.transformation;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateTransformation(token, id, fields, oldFile, newFile) {
  const hasFile = oldFile instanceof File || newFile instanceof File;
  if (hasFile) {
    const fd = new FormData();
    if (fields.name !== undefined) fd.append("name", String(fields.name).trim());
    if (fields.timeTaken !== undefined) fd.append("timeTaken", String(fields.timeTaken));
    if (fields.inchesLost !== undefined) fd.append("inchesLost", String(fields.inchesLost));
    if (fields.order !== undefined) fd.append("order", String(fields.order));
    if (fields.achievements !== undefined) fd.append("achievements", String(fields.achievements).trim());
    if (fields.description !== undefined) fd.append("description", String(fields.description).trim());
    if (fields.status !== undefined) fd.append("status", String(fields.status));
    if (oldFile instanceof File) fd.append("oldImage", oldFile);
    if (newFile instanceof File) fd.append("newImage", newFile);
    try {
      const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, fd, { headers: authHeader(token) });
      return body.transformation;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.timeTaken !== undefined) payload.timeTaken = Number(fields.timeTaken);
  if (fields.inchesLost !== undefined) payload.inchesLost = Number(fields.inchesLost);
  if (fields.order !== undefined) payload.order = Number(fields.order);
  if (fields.achievements !== undefined) payload.achievements = String(fields.achievements).trim();
  if (fields.description !== undefined) payload.description = String(fields.description).trim();
  if (fields.oldImage !== undefined) payload.oldImage = String(fields.oldImage).trim();
  if (fields.newImage !== undefined) payload.newImage = String(fields.newImage).trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  try {
    const { data: body } = await api.patch(`${base()}/${encodeURIComponent(id)}`, payload, { headers: authHeader(token) });
    return body.transformation;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteTransformation(token, id) {
  try {
    await api.delete(`${base()}/${encodeURIComponent(id)}`, { headers: authHeader(token) });
  } catch (error) {
    normalizeApiError(error);
  }
}
