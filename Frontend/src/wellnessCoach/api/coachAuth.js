import coachApi, { authHeader, normalizeApiError } from "./coachApi.js";

export async function coachRegister(fields) {
  try {
    const { data } = await coachApi.post("/coach/auth/register", fields);
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachLogin({ email, password }) {
  try {
    const { data } = await coachApi.post("/coach/auth/login", { email, password });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachSendLoginOtp({ phone, phoneCountryCode }) {
  try {
    const { data } = await coachApi.post("/coach/auth/otp/send", { phone, phoneCountryCode });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachVerifyLoginOtp({ phone, phoneCountryCode, otp }) {
  try {
    const { data } = await coachApi.post("/coach/auth/otp/verify", { phone, phoneCountryCode, otp });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetMe(token) {
  try {
    const { data } = await coachApi.get("/coach/auth/me", { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachGetPermissions(token) {
  try {
    const { data } = await coachApi.get("/coach/auth/me/permissions", {
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
    const { data } = await coachApi.patch("/coach/auth/me", body, { headers: authHeader(token) });
    return data;
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
    const { data } = await coachApi.patch("/coach/auth/me", fd, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function coachChangePassword(token, { currentPassword, newPassword }) {
  try {
    const { data } = await coachApi.patch(
      "/coach/auth/me/password",
      { currentPassword, newPassword },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
