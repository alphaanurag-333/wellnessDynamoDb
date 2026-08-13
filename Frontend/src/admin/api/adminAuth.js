import api, { authHeader, normalizeApiError } from "../../api.js";

/** Staff auth is Account-only. Portal wrappers keep legacy response shapes. */

export async function adminLogin({ email, password }) {
  try {
    const { data } = await api.post("/account/auth/login", {
      email,
      password,
      activeRole: "admin",
    });
    return {
      ...data,
      admin: data.admin || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetMe(token) {
  try {
    const { data } = await api.get("/account/auth/me", { headers: authHeader(token) });
    return {
      ...data,
      admin: data.admin || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMe(token, body) {
  try {
    const { data } = await api.patch("/account/auth/me", body, { headers: authHeader(token) });
    return {
      ...data,
      admin: data.admin || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

/**
 * PATCH profile with optional image. Backend multer field name: `file`.
 * Send multipart only when `file` is set; otherwise use adminUpdateMe (JSON).
 */
export async function adminUpdateMeWithFile(token, { name, phone, file }) {
  const fd = new FormData();
  if (name != null && String(name).trim() !== "") fd.append("name", String(name).trim());
  if (phone != null && String(phone).trim() !== "") fd.append("phone", String(phone).trim());
  if (file instanceof File) fd.append("file", file);

  try {
    const { data } = await api.patch("/account/auth/me", fd, { headers: authHeader(token) });
    return {
      ...data,
      admin: data.admin || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminChangePassword(token, { currentPassword, newPassword }) {
  try {
    const { data } = await api.patch(
      "/account/auth/me/password",
      { currentPassword, newPassword },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
