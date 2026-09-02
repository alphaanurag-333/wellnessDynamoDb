import api, { normalizeApiError } from "../../api.js";

export async function sendDeleteAccountOtp({ phone, phoneCountryCode }) {
  try {
    const { data } = await api.post("/user/auth/delete/otp/send", {
      phone,
      phoneCountryCode,
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function deleteAccountByOtp({ phone, phoneCountryCode, otp }) {
  try {
    const { data } = await api.post("/user/auth/delete", {
      phone,
      phoneCountryCode,
      otp,
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
