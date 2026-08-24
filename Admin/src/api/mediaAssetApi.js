import api, { authHeader, normalizeApiError } from "../api.js";
import { getAccountToken } from "./accountApi.js";
import { fetchDashboardMediaBlob } from "./dashboardApi.js";

function tokenOrStored(token) {
  return token || getAccountToken();
}

function formatAssetDate(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function mapMediaAsset(row) {
  if (!row) return null;
  const id = row.id || row._id;
  if (!id) return null;
  const sizeLabel = row.fileSizeLabel || row.fileSize || "";
  const type = ["image", "video", "audio"].includes(String(row.type || "").toLowerCase())
    ? String(row.type).toLowerCase()
    : "image";
  return {
    id,
    title: String(row.title || "").trim() || "Media asset",
    owner: String(row.owner || "Admin").trim() || "Admin",
    date: formatAssetDate(row.createdAt || row.updatedAt),
    size: sizeLabel,
    versions: Number(row.versions) || 1,
    live: row.status === "active",
    status: row.status === "active" ? "active" : "inactive",
    type,
    category: String(row.category || "").trim(),
    duration: String(row.duration || "").trim(),
    url: row.url || row.file || "",
    file: row.file || row.url || "",
    history: Array.isArray(row.history)
      ? row.history.map((entry) => ({
          n: Number(entry.n) || 1,
          url: entry.url || entry.file || "",
          owner: String(entry.owner || "Admin").trim() || "Admin",
          size: entry.fileSizeLabel || entry.fileSize || "",
          date: formatAssetDate(entry.uploadedAt),
          uploadedAt: entry.uploadedAt,
        }))
      : [],
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function galleryOwnersFromAssets(items = []) {
  const owners = new Set(["Admin"]);
  for (const entry of items) {
    if (entry?.owner) owners.add(entry.owner);
  }
  return ["All owners", ...Array.from(owners).sort((a, b) => a.localeCompare(b))];
}

export async function adminListMediaAssets(
  token,
  { page = 1, limit = 50, status, owner, search, type, category, from, to } = {}
) {
  const q = new URLSearchParams();
  q.set("page", String(page));
  q.set("limit", String(limit));
  if (status) q.set("status", status);
  if (owner) q.set("owner", owner);
  if (search && String(search).trim()) q.set("search", String(search).trim());
  if (type) q.set("type", type);
  if (category) q.set("category", category);
  if (from) q.set("from", from);
  if (to) q.set("to", to);
  try {
    const { data } = await api.get(`/admin/media-assets?${q}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    const items = (Array.isArray(data.media) ? data.media : [])
      .map((row) => mapMediaAsset(row))
      .filter(Boolean);
    return {
      items,
      pagination: data.pagination ?? { page, limit, total: items.length, pages: 1 },
    };
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminCreateMediaAsset(token, fields = {}, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const file = files.file instanceof File ? files.file : null;
  try {
    const fd = new FormData();
    fd.append("title", String(fields.title || file?.name || "Media asset").trim() || "Media asset");
    if (fields.owner) fd.append("owner", String(fields.owner));
    if (fields.type) fd.append("type", String(fields.type));
    if (fields.category) fd.append("category", String(fields.category));
    if (fields.duration) fd.append("duration", String(fields.duration));
    if (fields.status) fd.append("status", String(fields.status));
    else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
    if (file) fd.append("file", file);
    const { data } = await api.post("/admin/media-assets", fd, { headers });
    return mapMediaAsset(data.media);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminUpdateMediaAsset(token, id, fields = {}, files = {}) {
  const headers = authHeader(tokenOrStored(token));
  const file = files.file instanceof File ? files.file : null;
  try {
    if (file) {
      const fd = new FormData();
      if (fields.title !== undefined) fd.append("title", String(fields.title ?? "").trim());
      if (fields.owner !== undefined) fd.append("owner", String(fields.owner ?? "").trim());
      if (fields.type !== undefined) fd.append("type", String(fields.type));
      if (fields.category !== undefined) fd.append("category", String(fields.category ?? "").trim());
      if (fields.duration !== undefined) fd.append("duration", String(fields.duration ?? "").trim());
      if (fields.status !== undefined) fd.append("status", String(fields.status));
      else if (fields.live !== undefined) fd.append("status", fields.live ? "active" : "inactive");
      fd.append("file", file);
      const { data } = await api.patch(`/admin/media-assets/${encodeURIComponent(id)}`, fd, { headers });
      return mapMediaAsset(data.media);
    }
    const payload = {};
    if (fields.title !== undefined) payload.title = String(fields.title ?? "").trim();
    if (fields.owner !== undefined) payload.owner = String(fields.owner ?? "").trim();
    if (fields.type !== undefined) payload.type = String(fields.type);
    if (fields.category !== undefined) payload.category = String(fields.category ?? "").trim();
    if (fields.duration !== undefined) payload.duration = String(fields.duration ?? "").trim();
    if (fields.status !== undefined) payload.status = String(fields.status);
    else if (fields.live !== undefined) payload.status = fields.live ? "active" : "inactive";
    const { data } = await api.patch(`/admin/media-assets/${encodeURIComponent(id)}`, payload, { headers });
    return mapMediaAsset(data.media);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminDeleteMediaAsset(token, id) {
  try {
    await api.delete(`/admin/media-assets/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminGetMediaAsset(token, id) {
  try {
    const { data } = await api.get(`/admin/media-assets/${encodeURIComponent(id)}`, {
      headers: authHeader(tokenOrStored(token)),
    });
    return mapMediaAsset(data.media);
  } catch (error) {
    normalizeApiError(error);
  }
}

export async function adminRestoreMediaAssetVersion(token, id, version) {
  try {
    const { data } = await api.post(
      `/admin/media-assets/${encodeURIComponent(id)}/restore`,
      { version },
      { headers: authHeader(tokenOrStored(token)) }
    );
    return mapMediaAsset(data.media);
  } catch (error) {
    normalizeApiError(error);
  }
}

/** Fetch a media asset URL as a File for APIs that only accept multipart. */
export async function attachMediaAsset(asset, filename) {
  if (!asset?.url) throw new Error("Media asset URL is missing");

  let blob;
  try {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error("direct fetch failed");
    blob = await response.blob();
  } catch {
    // Prefer authenticated proxy when S3 CORS blocks browser fetch.
    blob = await fetchDashboardMediaBlob(asset.url);
  }

  if (!blob) throw new Error("Failed to download media asset");

  const ext =
    asset.type === "video" ? "mp4" : asset.type === "audio" ? "mp3" : "jpg";
  const name =
    filename ||
    (String(asset.title || "").includes(".") ? asset.title : null) ||
    `media-${asset.id || "asset"}.${ext}`;
  const type =
    blob.type ||
    (asset.type === "video" ? "video/mp4" : asset.type === "audio" ? "audio/mpeg" : "image/jpeg");
  return new File([blob], name, { type });
}

function guessExtension(asset, blob) {
  const fromName = String(asset?.title || "").match(/\.([a-z0-9]{2,5})$/i);
  if (fromName) return fromName[1].toLowerCase();
  const mime = String(blob?.type || "");
  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("gif")) return "gif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mpeg") || mime.includes("mp3")) return "mp3";
  if (mime.includes("wav")) return "wav";
  if (asset?.type === "video") return "mp4";
  if (asset?.type === "audio") return "mp3";
  return "bin";
}

/** Download a media asset URL to the user's device. */
export async function downloadMediaAsset(asset, filename) {
  if (!asset?.url) throw new Error("Media asset URL is missing");

  let blob;
  try {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error("direct fetch failed");
    blob = await response.blob();
  } catch {
    blob = await fetchDashboardMediaBlob(asset.url);
  }
  if (!blob) throw new Error("Failed to download media asset");

  const ext = guessExtension(asset, blob);
  const base = String(filename || asset.title || `media-${asset.id || "asset"}`)
    .replace(/[<>:"/\\|?*]+/g, "_")
    .trim() || `media-${asset.id || "asset"}`;
  const name = /\.[a-z0-9]{2,5}$/i.test(base) ? base : `${base}.${ext}`;

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = name;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  return name;
}
