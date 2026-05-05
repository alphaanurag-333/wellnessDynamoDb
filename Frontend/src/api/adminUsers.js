import api, { authHeader, normalizeApiError } from "../api.js";

function usersBase() {
  return "/admin/users";
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
  appendIfDefined(fd, "name", fields.name != null ? String(fields.name).trim() : undefined);
  appendIfDefined(fd, "email", fields.email != null ? String(fields.email).trim() : undefined);
  if (fields.password != null && String(fields.password).length > 0) {
    fd.append("password", String(fields.password));
  }
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
    fd.append("termsAcceptedAt", fields.termsAcceptedAt === "" || fields.termsAcceptedAt == null ? "" : String(fields.termsAcceptedAt));
  }
  if (fields.fcm_id !== undefined) {
    fd.append("fcm_id", fields.fcm_id == null ? "" : String(fields.fcm_id));
  }
  appendIfDefined(fd, "status", fields.status);
}

function jsonCreatePayload(fields) {
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
    fcm_id: fields.fcm_id != null && String(fields.fcm_id).trim() ? String(fields.fcm_id).trim() : undefined,
    status: fields.status || "active",
  };
  const pw = String(fields.password ?? "").trim();
  if (pw) payload.password = pw;
  if (fields.dob !== undefined && fields.dob !== "") {
    payload.dob = fields.dob;
  }
  const country = fields.country != null ? String(fields.country).trim() : "";
  const state = fields.state != null ? String(fields.state).trim() : "";
  const city = fields.city != null ? String(fields.city).trim() : "";
  if (country) payload.country = country;
  if (state) payload.state = state;
  if (city) payload.city = city;
  const phc = fields.primaryHealthConcern != null ? String(fields.primaryHealthConcern).trim() : "";
  if (phc) payload.primaryHealthConcern = phc;
  payload.termsAccepted = Boolean(fields.termsAccepted);
  if (payload.termsAccepted && fields.termsAcceptedAt) {
    payload.termsAcceptedAt = fields.termsAcceptedAt;
  }
  return payload;
}

export async function adminListUsers(token, { page = 1, limit = 20, status, search } = {}) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data: body } = await api.get(`${usersBase()}?${q}`, {
      headers: authHeader(token),
    });
    return {
      users: Array.isArray(body.users) ? body.users : [],
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
    return body.user ?? null;
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Create user — JSON or multipart when `file` is a File (field name `file`). `fields` = full create DTO (e.g. from buildApiPayload). */
export async function adminCreateUser(token, fields, file) {
  const body = jsonCreatePayload(fields);
  if (file instanceof File) {
    const fd = new FormData();
    appendUserFields(fd, body);
    fd.append("file", file);
    try {
      const { data: res } = await api.post(usersBase(), fd, {
        headers: authHeader(token),
      });
      return res.user;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  try {
    const { data: res } = await api.post(usersBase(), body, {
      headers: authHeader(token),
    });
    return res.user;
  } catch (error) {
    normalizeApiError(error);
  }
}

/** PATCH user — JSON or multipart when `file` is a File. */
export async function adminUpdateUser(token, id, fields, file) {
  if (file instanceof File) {
    const fd = new FormData();
    appendUserFields(fd, fields);
    fd.append("file", file);
    try {
      const { data: body } = await api.patch(`${usersBase()}/${encodeURIComponent(id)}`, fd, {
        headers: authHeader(token),
      });
      return body.user;
    } catch (error) {
      normalizeApiError(error);
    }
  }
  const payload = {};
  if (fields.name !== undefined) payload.name = fields.name;
  if (fields.email !== undefined) payload.email = fields.email;
  if (fields.password && String(fields.password).length > 0) payload.password = fields.password;
  if (fields.phone !== undefined) payload.phone = fields.phone;
  if (fields.phoneCountryCode !== undefined) payload.phoneCountryCode = fields.phoneCountryCode;
  if (fields.whatsappSameAsMobile !== undefined) payload.whatsappSameAsMobile = fields.whatsappSameAsMobile;
  if (fields.whatsappCountryCode !== undefined) payload.whatsappCountryCode = fields.whatsappCountryCode;
  if (fields.whatsappPhone !== undefined) payload.whatsappPhone = fields.whatsappPhone;
  if (fields.dob !== undefined) payload.dob = fields.dob === "" ? null : fields.dob;
  if (fields.gender !== undefined) payload.gender = fields.gender;
  if (fields.country !== undefined) payload.country = fields.country;
  if (fields.state !== undefined) payload.state = fields.state;
  if (fields.city !== undefined) payload.city = fields.city;
  if (fields.primaryHealthConcern !== undefined) payload.primaryHealthConcern = fields.primaryHealthConcern;
  if (fields.termsAccepted !== undefined) payload.termsAccepted = fields.termsAccepted;
  if (fields.termsAcceptedAt !== undefined) payload.termsAcceptedAt = fields.termsAcceptedAt;
  if (fields.fcm_id !== undefined) payload.fcm_id = fields.fcm_id;
  if (fields.status !== undefined) payload.status = fields.status;
  try {
    const { data: body } = await api.patch(`${usersBase()}/${encodeURIComponent(id)}`, payload, {
      headers: authHeader(token),
    });
    return body.user;
  } catch (error) {
    normalizeApiError(error);
  }
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
