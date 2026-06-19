import api, { authHeader, normalizeApiError } from "../../api.js";

function usersBase() {
  return "/admin/users";
}

/** DynamoDB items use `id`; API also returns `_id` for legacy UI. */
export function resolveUserId(user) {
  if (!user) return "";
  return String(user._id || user.id || "");
}

function normalizeUser(user) {
  if (!user) return null;
  const id = resolveUserId(user);
  return { ...user, id, _id: id };
}

function appendIfDefined(fd, key, value) {
  if (value === undefined) return;
  if (value === null) {
    fd.append(key, "");
    return;
  }
  if (typeof value === "boolean") {
    fd.append(key, value ? "true" : "false");
    return;
  }
  fd.append(key, String(value));
}

function appendUserFields(fd, fields) {
  if (!fields || typeof fields !== "object") return;
  appendIfDefined(fd, "name", fields.name != null ? String(fields.name).trim() : undefined);
  appendIfDefined(fd, "email", fields.email != null ? String(fields.email).trim() : undefined);
  appendIfDefined(fd, "phone", fields.phone != null ? String(fields.phone).trim() : undefined);
  appendIfDefined(fd, "phoneCountryCode", fields.phoneCountryCode);
  if (fields.whatsappSameAsMobile !== undefined) {
    fd.append("whatsappSameAsMobile", fields.whatsappSameAsMobile ? "true" : "false");
  }
  appendIfDefined(fd, "whatsappCountryCode", fields.whatsappCountryCode);
  appendIfDefined(fd, "whatsappPhone", fields.whatsappPhone);
  if (fields.dob !== undefined) {
    fd.append("dob", fields.dob === "" || fields.dob == null ? "" : String(fields.dob));
  }
  appendIfDefined(fd, "gender", fields.gender);
  appendIfDefined(fd, "country", fields.country);
  appendIfDefined(fd, "state", fields.state);
  appendIfDefined(fd, "city", fields.city);
  appendIfDefined(fd, "primaryHealthConcern", fields.primaryHealthConcern);
  if (fields.termsAccepted !== undefined) {
    fd.append("termsAccepted", fields.termsAccepted ? "true" : "false");
  }
  if (fields.termsAcceptedAt !== undefined) {
    fd.append(
      "termsAcceptedAt",
      fields.termsAcceptedAt === "" || fields.termsAcceptedAt == null ? "" : String(fields.termsAcceptedAt)
    );
  }
  if (fields.fcm_id !== undefined) {
    fd.append("fcm_id", fields.fcm_id == null ? "" : String(fields.fcm_id));
  }
  appendIfDefined(fd, "status", fields.status);
}

/** Matches POST /admin/users body (admin userController.createUserController). */
export function buildCreateUserPayload(fields, { includeTermsAccepted = true } = {}) {
  const phone = String(fields.phone ?? "").trim();
  const cc = String(fields.phoneCountryCode ?? "").trim() || "+91";
  const sameWa = Boolean(fields.whatsappSameAsMobile);
  const waCc = sameWa ? cc : String(fields.whatsappCountryCode ?? "").trim() || "+91";
  const waPhoneRaw = String(fields.whatsappPhone ?? "").trim();

  const payload = {
    name: String(fields.name ?? "").trim(),
    email: String(fields.email ?? "").trim().toLowerCase(),
    phone,
    phoneCountryCode: cc,
    whatsappSameAsMobile: sameWa,
    whatsappCountryCode: waCc,
    whatsappPhone: sameWa ? phone : waPhoneRaw || null,
    gender: fields.gender || "boy",
    status: fields.status || "active",
  };

  if (includeTermsAccepted) {
    payload.termsAccepted = Boolean(fields.termsAccepted);
  }

  const dob = fields.dob != null ? String(fields.dob).trim() : "";
  if (dob) payload.dob = dob;

  const country = fields.country != null ? String(fields.country).trim() : "";
  const state = fields.state != null ? String(fields.state).trim() : "";
  const city = fields.city != null ? String(fields.city).trim() : "";
  if (country) payload.country = country;
  if (state) payload.state = state;
  if (city) payload.city = city;

  const phc = fields.primaryHealthConcern != null ? String(fields.primaryHealthConcern).trim() : "";
  if (phc) payload.primaryHealthConcern = phc;

  const fcm = fields.fcm_id != null ? String(fields.fcm_id).trim() : "";
  if (fcm) payload.fcm_id = fcm;

  if (includeTermsAccepted && payload.termsAccepted && fields.termsAcceptedAt) {
    payload.termsAcceptedAt = fields.termsAcceptedAt;
  }

  return payload;
}

/** Matches PATCH /admin/users/:id partial body. */
export function buildUpdateUserPayload(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name).trim();
  if (fields.email !== undefined) payload.email = String(fields.email).trim().toLowerCase();
  if (fields.phone !== undefined) payload.phone = String(fields.phone).trim();
  if (fields.phoneCountryCode !== undefined) payload.phoneCountryCode = String(fields.phoneCountryCode).trim();
  if (fields.whatsappSameAsMobile !== undefined) {
    payload.whatsappSameAsMobile = Boolean(fields.whatsappSameAsMobile);
  }
  if (fields.whatsappCountryCode !== undefined) {
    payload.whatsappCountryCode = String(fields.whatsappCountryCode).trim();
  }
  if (fields.whatsappPhone !== undefined) {
    payload.whatsappPhone = fields.whatsappPhone === "" || fields.whatsappPhone == null ? null : String(fields.whatsappPhone).trim();
  }
  if (fields.dob !== undefined) payload.dob = fields.dob === "" || fields.dob == null ? null : fields.dob;
  if (fields.gender !== undefined) payload.gender = fields.gender;
  if (fields.country !== undefined) payload.country = String(fields.country ?? "").trim() || null;
  if (fields.state !== undefined) payload.state = String(fields.state ?? "").trim() || null;
  if (fields.city !== undefined) payload.city = String(fields.city ?? "").trim() || null;
  if (fields.primaryHealthConcern !== undefined) {
    payload.primaryHealthConcern = String(fields.primaryHealthConcern ?? "").trim() || "";
  }
  if (fields.termsAccepted !== undefined) payload.termsAccepted = Boolean(fields.termsAccepted);
  if (fields.termsAcceptedAt !== undefined) {
    payload.termsAcceptedAt =
      fields.termsAcceptedAt === "" || fields.termsAcceptedAt == null ? null : fields.termsAcceptedAt;
  }
  if (fields.fcm_id !== undefined) payload.fcm_id = fields.fcm_id == null ? "" : String(fields.fcm_id).trim() || null;
  if (fields.status !== undefined) payload.status = fields.status;
  return payload;
}

export async function adminListUsers(token, { page = 1, limit = 20, status, search, userTier, assignmentStatus } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (userTier) q.set("userTier", userTier);
  if (assignmentStatus) q.set("assignmentStatus", assignmentStatus);
  try {
    const { data: body } = await api.get(`${usersBase()}?${q}`, {
      headers: authHeader(token),
    });
    const users = Array.isArray(body.users) ? body.users.map(normalizeUser) : [];
    return {
      users,
      pagination: body.pagination ?? { page, limit, total: 0, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetUser(token, id) {
  try {
    const { data: body } = await api.get(`${usersBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
    return normalizeUser(body.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateUser(token, fields, file) {
  const body = buildCreateUserPayload(fields);
  if (file instanceof File) {
    const fd = new FormData();
    appendUserFields(fd, body);
    fd.append("file", file);
    try {
      const { data: res } = await api.post(usersBase(), fd, { headers: authHeader(token) });
      return normalizeUser(res.user);
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: res } = await api.post(usersBase(), body, {
      headers: authHeader(token),
    });
    return normalizeUser(res.user);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateUser(token, id, fields, file) {
  const payload = buildUpdateUserPayload(fields);
  const hasJsonFields = Object.keys(payload).length > 0;

  if (file instanceof File || hasJsonFields) {
    const fd = new FormData();
    if (hasJsonFields) appendUserFields(fd, payload);
    if (file instanceof File) fd.append("file", file);
    try {
      const { data: body } = await api.patch(`${usersBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return normalizeUser(body.user);
    } catch (error) {
      normalizeApiError(error);
    }
  }

  throw new Error("At least one field or profile image is required for update");
}

export async function adminDeleteUser(token, id) {
  try {
    await api.delete(`${usersBase()}/${encodeURIComponent(id)}`, {
      headers: authHeader(token),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

/** @deprecated Use buildCreateUserPayload — kept for UserAdd.jsx */
export const buildApiPayload = buildCreateUserPayload;

export { normalizeUser };
