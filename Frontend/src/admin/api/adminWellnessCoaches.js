import api, { authHeader, normalizeApiError } from "../../api.js";

function coachesBase() {
  return "/admin/wellness-coaches";
}

export function resolveCoachId(row) {
  if (!row) return "";
  return String(row._id || row.id || "");
}

function normalizeCoach(row) {
  if (!row) return null;
  const id = resolveCoachId(row);
  return { ...row, id, _id: id };
}

function normalizeAssistant(row) {
  if (!row) return null;
  const id = String(row._id || row.id || "");
  return { ...row, id, _id: id };
}

function appendCoachFields(fd, fields) {
  if (!fields || typeof fields !== "object") return;
  const keys = [
    "name",
    "email",
    "phone",
    "phoneCountryCode",
    "bio",
    "specializationId",
    "country",
    "state",
    "city",
    "status",
    "password",
  ];
  for (const key of keys) {
    if (fields[key] !== undefined && fields[key] !== null) {
      fd.append(key, String(fields[key]));
    }
  }
}

function appendAssistantFields(fd, fields) {
  if (!fields || typeof fields !== "object") return;
  const keys = ["name", "email", "phone", "phoneCountryCode", "designation", "status", "password"];
  for (const key of keys) {
    if (fields[key] !== undefined && fields[key] !== null) {
      fd.append(key, String(fields[key]));
    }
  }
}

export function buildCoachPayload(fields) {
  return {
    name: String(fields.name ?? "").trim(),
    email: String(fields.email ?? "").trim().toLowerCase(),
    phone: String(fields.phone ?? "").trim(),
    phoneCountryCode: String(fields.phoneCountryCode ?? "+91").trim() || "+91",
    bio: fields.bio != null ? String(fields.bio).trim() || null : null,
    specializationId:
      fields.specializationId != null ? String(fields.specializationId).trim() || null : null,
    country: fields.country != null ? String(fields.country).trim() || null : null,
    state: fields.state != null ? String(fields.state).trim() || null : null,
    city: fields.city != null ? String(fields.city).trim() || null : null,
    status: fields.status || "active",
    password: fields.password != null ? String(fields.password) : undefined,
  };
}

export function buildCoachUpdatePayload(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.email !== undefined) payload.email = String(fields.email).trim().toLowerCase();
  if (fields.phone !== undefined) payload.phone = String(fields.phone).trim();
  if (fields.phoneCountryCode !== undefined) payload.phoneCountryCode = String(fields.phoneCountryCode).trim();
  if (fields.bio !== undefined) payload.bio = String(fields.bio ?? "").trim() || null;
  if (fields.specializationId !== undefined) {
    payload.specializationId = String(fields.specializationId ?? "").trim() || null;
  }
  if (fields.country !== undefined) payload.country = String(fields.country ?? "").trim() || null;
  if (fields.state !== undefined) payload.state = String(fields.state ?? "").trim() || null;
  if (fields.city !== undefined) payload.city = String(fields.city ?? "").trim() || null;
  if (fields.status !== undefined) payload.status = fields.status;
  if (fields.password !== undefined) payload.password = String(fields.password);
  return payload;
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
  if (fields.designation !== undefined) {
    payload.designation = String(fields.designation ?? "").trim() || null;
  }
  if (fields.status !== undefined) payload.status = fields.status;
  if (fields.password !== undefined) payload.password = String(fields.password);
  return payload;
}

export async function adminListWellnessCoaches(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${coachesBase()}?${q}`, { headers: authHeader(token) });
    const wellnessCoaches = Array.isArray(data.wellnessCoaches)
      ? data.wellnessCoaches.map(normalizeCoach)
      : [];
    return {
      wellnessCoaches,
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetWellnessCoach(token, id) {
  try {
    const { data } = await api.get(`${coachesBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return normalizeCoach(data.wellnessCoach);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateWellnessCoach(token, fields, file) {
  const body = buildCoachPayload(fields);
  if (file instanceof File) {
    const fd = new FormData();
    appendCoachFields(fd, body);
    fd.append("file", file);
    try {
      const { data } = await api.post(coachesBase(), fd, { headers: authHeader(token) });
      return normalizeCoach(data.wellnessCoach);
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data } = await api.post(coachesBase(), body, { headers: authHeader(token) });
    return normalizeCoach(data.wellnessCoach);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateWellnessCoach(token, id, fields, file) {
  const payload = buildCoachUpdatePayload(fields);
  const hasJson = Object.keys(payload).length > 0;
  if (file instanceof File || hasJson) {
    const fd = new FormData();
    if (hasJson) appendCoachFields(fd, payload);
    if (file instanceof File) fd.append("file", file);
    try {
      const { data } = await api.patch(`${coachesBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return normalizeCoach(data.wellnessCoach);
    } catch (error) {
      normalizeApiError(error);
    }
  }
  throw new Error("At least one field or profile image is required for update");
}

export async function adminDeleteWellnessCoach(token, id) {
  try {
    await api.delete(`${coachesBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateWellnessCoachApproval(token, id, approvalStatus) {
  try {
    const fd = new FormData();
    fd.append("approvalStatus", approvalStatus);
    const { data } = await api.patch(`${coachesBase()}/${encodeURIComponent(id)}`, fd, {
      headers: authHeader(token),
    });
    return normalizeCoach(data.wellnessCoach);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListAllAssistants(token, { page = 1, limit = 20, status, search, wellnessCoachId } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (wellnessCoachId) q.set("wellnessCoachId", wellnessCoachId);
  try {
    const { data } = await api.get(`${coachesBase()}/assistants?${q}`, {
      headers: authHeader(token),
    });
    const assistants = Array.isArray(data.assistants) ? data.assistants.map(normalizeAssistant) : [];
    return {
      assistants,
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminListCoachAssistants(token, coachId, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(
      `${coachesBase()}/${encodeURIComponent(coachId)}/assistants?${q}`,
      { headers: authHeader(token) }
    );
    const assistants = Array.isArray(data.assistants) ? data.assistants.map(normalizeAssistant) : [];
    return {
      assistants,
      pagination: data.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetCoachAssistant(token, coachId, assistantId) {
  try {
    const { data } = await api.get(
      `${coachesBase()}/${encodeURIComponent(coachId)}/assistants/${encodeURIComponent(assistantId)}`,
      { headers: authHeader(token) }
    );
    return normalizeAssistant(data.assistant);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateCoachAssistant(token, coachId, fields, file) {
  const body = buildAssistantPayload(fields);
  if (file instanceof File) {
    const fd = new FormData();
    appendAssistantFields(fd, body);
    fd.append("file", file);
    try {
      const { data } = await api.post(
        `${coachesBase()}/${encodeURIComponent(coachId)}/assistants`,
        fd,
        { headers: authHeader(token) }
      );
      return normalizeAssistant(data.assistant);
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data } = await api.post(
      `${coachesBase()}/${encodeURIComponent(coachId)}/assistants`,
      body,
      { headers: authHeader(token) }
    );
    return normalizeAssistant(data.assistant);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateCoachAssistant(token, coachId, assistantId, fields, file) {
  const payload = buildAssistantUpdatePayload(fields);
  const hasJson = Object.keys(payload).length > 0;
  if (file instanceof File || hasJson) {
    const fd = new FormData();
    if (hasJson) appendAssistantFields(fd, payload);
    if (file instanceof File) fd.append("file", file);
    try {
      const { data } = await api.patch(
        `${coachesBase()}/${encodeURIComponent(coachId)}/assistants/${encodeURIComponent(assistantId)}`,
        fd,
        { headers: authHeader(token) }
      );
      return normalizeAssistant(data.assistant);
    } catch (error) {
      normalizeApiError(error);
    }
  }
  throw new Error("At least one field or profile image is required for update");
}

export async function adminDeleteCoachAssistant(token, coachId, assistantId) {
  try {
    await api.delete(
      `${coachesBase()}/${encodeURIComponent(coachId)}/assistants/${encodeURIComponent(assistantId)}`,
      { headers: authHeader(token) }
    );
  } catch (error) {
    normalizeApiError(error);
  }
}
