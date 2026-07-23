import staffApi, { authHeader, normalizeApiError } from "./staffApi.js";

export async function staffLogin({ email, password }) {
  try {
    const { data } = await staffApi.post("/staff/auth/login", { email, password });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function staffSendLoginOtp({ phone, phoneCountryCode }) {
  try {
    const { data } = await staffApi.post("/staff/auth/otp/send", { phone, phoneCountryCode });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function staffVerifyLoginOtp({ phone, phoneCountryCode, otp }) {
  try {
    const { data } = await staffApi.post("/staff/auth/otp/verify", { phone, phoneCountryCode, otp });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function staffGetMe(token) {
  try {
    const { data } = await staffApi.get("/staff/auth/me", { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function staffUpdateMe(token, body) {
  try {
    const { data } = await staffApi.patch("/staff/auth/me", body, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function staffUpdateMeWithFile(token, { name, phone, phoneCountryCode, bio, designation, file }) {
  const fd = new FormData();
  if (name != null && String(name).trim() !== "") fd.append("name", String(name).trim());
  if (phone != null && String(phone).trim() !== "") fd.append("phone", String(phone).trim());
  if (phoneCountryCode != null && String(phoneCountryCode).trim() !== "") {
    fd.append("phoneCountryCode", String(phoneCountryCode).trim());
  }
  if (bio != null) fd.append("bio", String(bio).trim());
  if (designation != null) fd.append("designation", String(designation).trim());
  if (file instanceof File) fd.append("file", file);

  try {
    const { data } = await staffApi.patch("/staff/auth/me", fd, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function staffChangePassword(token, { currentPassword, newPassword }) {
  try {
    const { data } = await staffApi.patch(
      "/staff/auth/me/password",
      { currentPassword, newPassword },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
