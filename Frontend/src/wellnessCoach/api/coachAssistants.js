import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

function normalizeAssistant(row) {
  if (!row) return null;
  const id = String(row._id || row.id || "");
  return { ...row, id, _id: id };
}

function appendAssistantFields(fd, fields) {
  const keys = ["name", "email", "phone", "phoneCountryCode", "designation", "status", "password"];
  for (const key of keys) {
    if (fields[key] !== undefined && fields[key] !== null) {
      fd.append(key, String(fields[key]));
    }
  }
}

export function buildAssistantPayload(fields) {
  return {
    name: String(fields.name ?? "").trim(),
    email: String(fields.email ?? "").trim().toLowerCase(),
    phone: String(fields.phone ?? "").trim(),
    phoneCountryCode: String(fields.phoneCountryCode ?? "+91").trim() || "+91",
    designation: fields.designation != null ? String(fields.designation).trim() || null : null,
    status: fields.status || "active",
    password: fields.password != null ? String(fields.password) : undefined,
  };
}

export function buildAssistantUpdatePayload(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.email !== undefined) payload.email = String(fields.email).trim().toLowerCase();
  if (fields.phone !== undefined) payload.phone = String(fields.phone).trim();
  if (fields.phoneCountryCode !== undefined) payload.phoneCountryCode = String(fields.phoneCountryCode).trim();
  if (fields.designation !== undefined) payload.designation = String(fields.designation ?? "").trim() || null;
  if (fields.status !== undefined) payload.status = fields.status;
  if (fields.password !== undefined) payload.password = String(fields.password);
  return payload;
}

export async function coachListAssistants(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await coachApi.get(`/coach/assistants?${q}`, { headers: authHeader(token) });
    const assistants = Array.isArray(data.assistants) ? data.assistants.map(normalizeAssistant) : [];
    return {
      assistants,
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetAssistantCount(token) {
  try {
    const { data } = await coachApi.get("/coach/assistants/count", { headers: authHeader(token) });
    return data.count ?? 0;
  } catch {
    return 0;
  }
}

export async function coachGetAssistant(token, id) {
  try {
    const { data } = await coachApi.get(`/coach/assistants/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return normalizeAssistant(data.assistant);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachCreateAssistant(token, fields, file) {
  const body = buildAssistantPayload(fields);
  const fd = new FormData();
  appendAssistantFields(fd, body);
  if (file instanceof File) fd.append("file", file);
  try {
    const { data } = await coachApi.post("/coach/assistants", fd, { headers: authHeader(token) });
    return normalizeAssistant(data.assistant);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateAssistant(token, id, fields, file) {
  const payload = buildAssistantUpdatePayload(fields);
  const fd = new FormData();
  appendAssistantFields(fd, payload);
  if (file instanceof File) fd.append("file", file);
  try {
    const { data } = await coachApi.patch(`/coach/assistants/${encodeURIComponent(id)}`, fd, {
      headers: authHeader(token),
    });
    return normalizeAssistant(data.assistant);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachDeleteAssistant(token, id) {
  try {
    await coachApi.delete(`/coach/assistants/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
