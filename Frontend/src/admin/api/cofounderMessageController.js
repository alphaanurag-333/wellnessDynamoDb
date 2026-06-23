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
  const normalizedType = String(fields?.type || "link").trim().toLowerCase();
  const fd = new FormData();
  fd.append("name", String(fields.name ?? "").trim());
  fd.append("message", String(fields.message ?? "").trim());
  fd.append("type", normalizedType);
  if (fields?.status !== undefined) fd.append("status", String(fields.status).trim());
  if (normalizedType === "link") {
    fd.append("ytLink", String(fields.ytLink ?? "").trim());
  }
  if (fields.profileImageFile instanceof File) fd.append("profileImage", fields.profileImageFile);
  if (normalizedType === "video" && fields.videoFile instanceof File) {
    fd.append("videoFile", fields.videoFile);
  }
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
