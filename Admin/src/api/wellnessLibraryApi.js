import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { mapWellnessLibraryItem } from "../data/wellnessLibraryData.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

const KIND_CONFIG = {
  mental: {
    base: "/admin/mental-wellbeing",
    listKey: "items",
    assignPath: (userId) => `/account/heal-users/${encodeURIComponent(userId)}/mental-wellbeing`,
    assignBody: (ids) => ({ mentalWellbeingIds: ids }),
    contentKey: "mentalWellbeing",
  },
  yoga: {
    base: "/admin/wellness-yoga",
    listKey: "items",
    assignPath: (userId) => `/account/heal-users/${encodeURIComponent(userId)}/wellness-yoga`,
    assignBody: (ids) => ({ yogaIds: ids }),
    contentKey: "yoga",
  },
  exercise: {
    base: "/admin/physical-exercises",
    listKey: "physicalExercises",
    assignPath: (userId) => `/account/heal-users/${encodeURIComponent(userId)}/physical-exercises`,
    assignBody: (ids) => ({ exerciseIds: ids }),
    contentKey: "exercise",
  },
};

function kindConfig(kind) {
  const config = KIND_CONFIG[kind];
  if (!config) throw new Error(`Unknown wellness library kind: ${kind}`);
  return config;
}

function appendFields(fd, fields) {
  if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
  if (fields.type !== undefined) fd.append("type", String(fields.type || "ytlink"));
  if (fields.ytLink !== undefined) fd.append("ytLink", String(fields.ytLink ?? "").trim());
  if (fields.duration !== undefined) fd.append("duration", String(fields.duration ?? "").trim());
  if (fields.status !== undefined) fd.append("status", String(fields.status));
  else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
}

function fieldsToPayload(fields) {
  const payload = {};
  if (fields.title !== undefined) payload.title = String(fields.title ?? "").trim();
  if (fields.type !== undefined) payload.type = String(fields.type || "ytlink");
  if (fields.ytLink !== undefined) payload.ytLink = String(fields.ytLink ?? "").trim();
  if (fields.duration !== undefined) payload.duration = String(fields.duration ?? "").trim();
  if (fields.status !== undefined) payload.status = String(fields.status);
  else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
  return payload;
}

function hasMediaFiles(files) {
  return files?.thumbnailFile instanceof File || files?.videoFile instanceof File;
}

function appendMedia(fd, files = {}) {
  if (files.thumbnailFile instanceof File) fd.append("thumbnailFile", files.thumbnailFile);
  if (files.videoFile instanceof File) fd.append("videoFile", files.videoFile);
}

function mapRows(data, listKey) {
  const rows = Array.isArray(data?.[listKey])
    ? data[listKey]
    : Array.isArray(data?.items)
      ? data.items
      : [];
  return rows.map(mapWellnessLibraryItem).filter(Boolean);
}

export async function adminListWellnessLibrary(kind, token, { page = 1, limit = 20, status, type, search } = {}) {
  const { base, listKey } = kindConfig(kind);
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (type) q.set("type", type);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  try {
    const { data } = await api.get(`${base}?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const items = mapRows(data, listKey);
    return {
      items,
      pagination: data.pagination ?? { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminPreviewYoutubeDuration(kind, url) {
  const { base } = kindConfig(kind);
  const q = new URLSearchParams({ url: String(url || "").trim() });
  try {
    const { data } = await api.get(`${base}/youtube-duration?${q}`, {
      headers: authHeader(tokenOrStored()),
    });
    return String(data?.duration || "").trim();
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateWellnessLibraryItem(kind, token, fields, files = {}) {
  const { base } = kindConfig(kind);
  const headers = authHeader(tokenOrStored(token));
  const payload = {
    title: fields.title ?? "",
    type: fields.type || "ytlink",
    ytLink: fields.ytLink ?? "",
    duration: fields.duration ?? "",
    status: fields.status || (fields.live === false ? "inactive" : "active"),
  };
  try {
    if (hasMediaFiles(files)) {
      const fd = new FormData();
      appendFields(fd, payload);
      appendMedia(fd, files);
      const { data } = await api.post(base, fd, { headers });
      return mapWellnessLibraryItem(data.item || data.physicalExercise);
    }
    const { data } = await api.post(base, payload, { headers });
    return mapWellnessLibraryItem(data.item || data.physicalExercise);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateWellnessLibraryItem(kind, token, id, fields, files = {}) {
  const { base } = kindConfig(kind);
  const headers = authHeader(tokenOrStored(token));
  try {
    if (hasMediaFiles(files)) {
      const fd = new FormData();
      appendFields(fd, fields);
      appendMedia(fd, files);
      const { data } = await api.patch(`${base}/${encodeURIComponent(id)}`, fd, { headers });
      return mapWellnessLibraryItem(data.item || data.physicalExercise);
    }
    const { data } = await api.patch(`${base}/${encodeURIComponent(id)}`, fieldsToPayload(fields), { headers });
    return mapWellnessLibraryItem(data.item || data.physicalExercise);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteWellnessLibraryItem(kind, token, id) {
  const { base } = kindConfig(kind);
  try {
    await api.delete(`${base}/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export function mapWellnessAssignment(row, kind) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const { contentKey } = kindConfig(kind);
  const content = row[contentKey] || row.mentalWellbeing || row.yoga || row.exercise || {};
  const item = mapWellnessLibraryItem({
    ...content,
    id: content.id || content._id || row.mentalWellbeingId || row.yogaId || row.exerciseId,
  });
  if (!item) return null;
  return {
    assignmentId: String(id),
    itemId: item.id,
    item,
  };
}

export async function listUserWellnessAssignments(kind, userId) {
  const { assignPath } = kindConfig(kind);
  try {
    const { data } = await api.get(assignPath(userId), {
      headers: authHeader(tokenOrStored()),
    });
    return (Array.isArray(data.assignments) ? data.assignments : [])
      .map((row) => mapWellnessAssignment(row, kind))
      .filter(Boolean);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function assignUserWellnessItems(kind, userId, ids) {
  const { assignPath, assignBody } = kindConfig(kind);
  try {
    const { data } = await api.post(assignPath(userId), assignBody(ids), {
      headers: authHeader(tokenOrStored()),
    });
    return (Array.isArray(data.assignments) ? data.assignments : [])
      .map((row) => mapWellnessAssignment(row, kind))
      .filter(Boolean);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function unassignUserWellnessItem(kind, userId, assignmentId) {
  const { assignPath } = kindConfig(kind);
  try {
    await api.delete(`${assignPath(userId)}/${encodeURIComponent(assignmentId)}`, {
      headers: authHeader(tokenOrStored()),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}
