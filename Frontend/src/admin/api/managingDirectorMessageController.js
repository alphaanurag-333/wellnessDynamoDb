import api, { authHeader, normalizeApiError } from "../../api.js";

function managingDirectorMessageBase() {
  return "/admin/managing-director-message";
}

export async function adminGetManagingDirectorMessage(token) {
  try {
    const { data } = await api.get(managingDirectorMessageBase(), { headers: authHeader(token) });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

function buildFormData(fields) {
  const normalizedType = String(fields?.type || "link").trim().toLowerCase();
  const fd = new FormData();
  fd.append("name", String(fields.name ?? "").trim());
  fd.append("designation", String(fields.designation ?? "Managing Director").trim());
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

export async function adminCreateManagingDirectorMessage(token, fields) {
  try {
    const { data } = await api.post(managingDirectorMessageBase(), buildFormData(fields), {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateManagingDirectorMessage(token, fields) {
  try {
    const { data } = await api.patch(managingDirectorMessageBase(), buildFormData(fields), {
      headers: authHeader(token),
    });
    return data;
  } catch (error) {
    normalizeApiError(error);
  }
}
