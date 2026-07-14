import api, { authHeader, normalizeApiError } from "../../api.js";

function cofounderMessageBase() {
  return "/admin/cofounder-message";
}

export async function adminGetCofounderMessage(token) {
  try {
    const { data } = await api.get(cofounderMessageBase(), { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

function buildFormData(fields) {
  const fd = new FormData();
  fd.append("name", String(fields.name ?? "").trim());
  fd.append("message", String(fields.message ?? "").trim());
  if (fields?.status !== undefined) fd.append("status", String(fields.status).trim());
  if (fields.profileImageFile instanceof File) fd.append("profileImage", fields.profileImageFile);
  return fd;
}

export async function adminCreateCofounderMessage(token, fields) {
  try {
    const { data } = await api.post(cofounderMessageBase(), buildFormData(fields), {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateCofounderMessage(token, fields) {
  try {
    const { data } = await api.patch(cofounderMessageBase(), buildFormData(fields), {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
