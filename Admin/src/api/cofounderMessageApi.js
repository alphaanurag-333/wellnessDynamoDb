import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";

const BASE = "/admin/cofounder-message";

function tokenOrStored(token) {
  return token || getAccountToken();
}

export function mapCofounderMessage(row) {
  if (!row) return null;
  const type = String(row.type || "none").toLowerCase();
  const normalizedType = ["none", "link", "video"].includes(type) ? type : "none";
  return {
    id: row.id || row._id || "cofounder-message",
    name: String(row.name || "").trim(),
    message: String(row.message || "").trim(),
    profileImage: row.profileImage || "",
    type: normalizedType,
    ytLink: String(row.ytLink || "").trim(),
    video: row.video || "",
    live: row.status !== "inactive",
    status: row.status === "inactive" ? "inactive" : "active",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function editorFromCofounder(row, fallback = {}) {
  const mapped = mapCofounderMessage(row);
  if (!mapped) {
    return {
      ...fallback,
      appOn: true,
      webOn: true,
      name: "",
      description: "",
      photoUploaded: false,
      videoUploaded: false,
      videoLink: "",
      type: "none",
      live: false,
      profileImage: "",
    };
  }
  const hasVideo = mapped.type === "video" && Boolean(mapped.video);
  const hasLink = mapped.type === "link" && Boolean(mapped.ytLink);
  return {
    ...fallback,
    id: mapped.id,
    appOn: mapped.live,
    webOn: mapped.live,
    name: mapped.name,
    description: mapped.message,
    photoUploaded: Boolean(mapped.profileImage),
    videoUploaded: hasVideo || hasLink,
    videoLink: mapped.ytLink,
    type: mapped.type,
    live: mapped.live,
    profileImage: mapped.profileImage,
    video: mapped.video,
    updatedAt: mapped.updatedAt,
  };
}

function appendFields(form, fields) {
  if (fields.name !== undefined) form.append("name", String(fields.name || "").trim());
  if (fields.message !== undefined) form.append("message", String(fields.message || "").trim());
  if (fields.type !== undefined) form.append("type", String(fields.type || "none"));
  if (fields.ytLink !== undefined) form.append("ytLink", String(fields.ytLink || "").trim());
  if (fields.status !== undefined) form.append("status", String(fields.status));
  else if (fields.live !== undefined) form.append("status", fields.live ? "active" : "inactive");
}

function jsonFields(fields) {
  const payload = {};
  if (fields.name !== undefined) payload.name = String(fields.name || "").trim();
  if (fields.message !== undefined) payload.message = String(fields.message || "").trim();
  if (fields.type !== undefined) payload.type = String(fields.type || "none");
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink || "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

export async function adminGetCofounderMessage(token) {
  try {
    const { data } = await api.get(BASE, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapCofounderMessage(data.data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateCofounderMessage(token, fields, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const form = new FormData();
    appendFields(form, fields);
    if (files.profileImage instanceof File) form.append("profileImage", files.profileImage);
    if (files.videoFile instanceof File) form.append("videoFile", files.videoFile);
    const { data } = await api.post(BASE, form, { headers });
    return mapCofounderMessage(data.data);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateCofounderMessage(token, fields = {}, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  try {
    const hasFiles = files.profileImage instanceof File || files.videoFile instanceof File;
    let payload = jsonFields(fields);
    if (hasFiles) {
      payload = new FormData();
      appendFields(payload, fields);
      if (files.profileImage instanceof File) payload.append("profileImage", files.profileImage);
      if (files.videoFile instanceof File) payload.append("videoFile", files.videoFile);
    }
    const { data } = await api.patch(BASE, payload, { headers });
    return mapCofounderMessage(data.data);
  } catch (error) {
    normalizeApiError(error);
  }
}
