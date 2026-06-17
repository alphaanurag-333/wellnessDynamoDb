import assistantApi, { authHeader, normalizeApiError } from "./assistantApi.js";

export async function assistantLogin({ email, password }) {
  try {
    const { data } = await assistantApi.post("/assistant/auth/login", { email, password });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantSendLoginOtp({ phone, phoneCountryCode }) {
  try {
    const { data } = await assistantApi.post("/assistant/auth/otp/send", { phone, phoneCountryCode });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantVerifyLoginOtp({ phone, phoneCountryCode, otp }) {
  try {
    const { data } = await assistantApi.post("/assistant/auth/otp/verify", { phone, phoneCountryCode, otp });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantGetMe(token) {
  try {
    const { data } = await assistantApi.get("/assistant/auth/me", { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateMe(token, body) {
  try {
    const { data } = await assistantApi.patch("/assistant/auth/me", body, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantUpdateMeWithFile(token, { name, phone, phoneCountryCode, designation, file }) {
  const fd = new FormData();
  if (name != null && String(name).trim() !== "") fd.append("name", String(name).trim());
  if (phone != null && String(phone).trim() !== "") fd.append("phone", String(phone).trim());
  if (phoneCountryCode != null && String(phoneCountryCode).trim() !== "") {
    fd.append("phoneCountryCode", String(phoneCountryCode).trim());
  }
  if (designation != null) fd.append("designation", String(designation).trim());
  if (file instanceof File) fd.append("file", file);

  try {
    const { data } = await assistantApi.patch("/assistant/auth/me", fd, { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assistantChangePassword(token, { currentPassword, newPassword }) {
  try {
    const { data } = await assistantApi.patch(
      "/assistant/auth/me/password",
      { currentPassword, newPassword },
      { headers: authHeader(token) },
    );
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
