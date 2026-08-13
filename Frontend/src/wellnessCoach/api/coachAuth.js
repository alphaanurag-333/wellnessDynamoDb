import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

/** Staff auth is Account-only. Keep coach* response aliases for the coach portal. */

export async function coachRegister(fields) {
  try {
    const { data } = await coachApi.post("/account/auth/register/coach", fields);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachLogin({ email, password }) {
  try {
    const { data } = await coachApi.post("/account/auth/login", {
      email,
      password,
      activeRole: "wellness_coach",
    });
    return {
      ...data,
      coach: data.coach || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachSendLoginOtp({ phone, phoneCountryCode }) {
  try {
    const { data } = await coachApi.post("/account/auth/otp/send", { phone, phoneCountryCode });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachVerifyLoginOtp({ phone, phoneCountryCode, otp }) {
  try {
    const { data } = await coachApi.post("/account/auth/otp/verify", {
      phone,
      phoneCountryCode,
      otp,
      activeRole: "wellness_coach",
    });
    return {
      ...data,
      coach: data.coach || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetMe(token) {
  try {
    const { data } = await coachApi.get("/account/auth/me", { headers: authHeader(token) });
    return {
      ...data,
      coach: data.coach || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetPermissions(token) {
  try {
    const { data } = await coachApi.get("/coach/me/permissions", {
      headers: authHeader(token),
    });
    return {
      roleId: data.roleId ?? null,
      permissions: data.permissions && typeof data.permissions === "object" ? data.permissions : {},
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateMe(token, body) {
  try {
    const { data } = await coachApi.patch("/account/auth/me", body, { headers: authHeader(token) });
    return {
      ...data,
      coach: data.coach || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachUpdateMeWithFile(token, { name, phone, phoneCountryCode, bio, file }) {
  const fd = new FormData();
  if (name != null && String(name).trim() !== "") fd.append("name", String(name).trim());
  if (phone != null && String(phone).trim() !== "") fd.append("phone", String(phone).trim());
  if (phoneCountryCode != null && String(phoneCountryCode).trim() !== "") {
    fd.append("phoneCountryCode", String(phoneCountryCode).trim());
  }
  if (bio != null) fd.append("bio", String(bio).trim());
  if (file instanceof File) fd.append("file", file);

  try {
    const { data } = await coachApi.patch("/account/auth/me", fd, { headers: authHeader(token) });
    return {
      ...data,
      coach: data.coach || data.account,
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachChangePassword(token, { currentPassword, newPassword }) {
  try {
    const { data } = await coachApi.patch(
      "/account/auth/me/password",
      { currentPassword, newPassword },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
