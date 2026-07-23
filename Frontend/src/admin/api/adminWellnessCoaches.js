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
  return {
    ...row,
    id,
    _id: id,
    webVisible: row.webVisible !== false,
    appVisible: row.appVisible !== false,
  };
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
    "webVisible",
    "appVisible",
    "password",
  ];
  for (const key of keys) {
    if (fields[key] !== undefined && fields[key] !== null) {
      fd.append(key, String(fields[key]));
    }
  }
  if (fields.roleId !== undefined) {
    fd.append("roleId", fields.roleId == null ? "" : String(fields.roleId));
  }
  if (fields.permissionOverrides !== undefined) {
    fd.append(
      "permissionOverrides",
      fields.permissionOverrides == null
        ? ""
        : JSON.stringify(fields.permissionOverrides)
    );
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
    webVisible: fields.webVisible !== false,
    appVisible: fields.appVisible !== false,
    password: fields.password != null ? String(fields.password) : undefined,
    roleId: fields.roleId !== undefined ? (fields.roleId ? String(fields.roleId) : null) : undefined,
    permissionOverrides:
      fields.permissionOverrides !== undefined ? fields.permissionOverrides : undefined,
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
  if (fields.webVisible !== undefined) payload.webVisible = Boolean(fields.webVisible);
  if (fields.appVisible !== undefined) payload.appVisible = Boolean(fields.appVisible);
  if (fields.password !== undefined) payload.password = String(fields.password);
  if (fields.roleId !== undefined) payload.roleId = fields.roleId ? String(fields.roleId) : null;
  if (fields.permissionOverrides !== undefined) {
    payload.permissionOverrides = fields.permissionOverrides;
  }
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
