import { getApiBase } from "./api.js";

export { DEFAULT_IMAGE_SRC, handleMediaImageError, resolveMediaImageSrc } from "./admin/components/AdminMediaImage.jsx";

function getS3PublicBaseUrl() {
  const fromEnv =
    typeof import.meta !== "undefined"
      ? String(import.meta.env?.VITE_S3_PUBLIC_BASE_URL || "").trim()
      : "";
  return fromEnv.replace(/\/$/, "");
}

function encodeS3KeyForUrl(key) {
  return String(key)
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

/** True for stored upload keys like `user/photo.jpg` (not API routes). */
function looksLikeS3ObjectKey(path) {
  if (!path || path.startsWith("api/") || path.startsWith("/api/")) return false;
  return /^(user|users|admin|wellness-coach|assistant-wellness-coach|banners|health-|client-|leadership|program-|real-people|supplements|mental-|yoga|physical-|transformation|cofounder|notifications|app-config)\b/i.test(
    path
  );
}

/** Normalize stored upload paths and build absolute media URLs. */
export function mediaUrl(path) {
  if (path == null || path === "") return "";
  const raw = String(path).trim();
  if (!raw) return "";

  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  let normalized = raw.replace(/\\/g, "/").replace(/^\/+/, "");

  const s3Base = getS3PublicBaseUrl();
  if (s3Base && looksLikeS3ObjectKey(normalized)) {
    return `${s3Base}/${encodeS3KeyForUrl(normalized)}`;
  }

  const base = getApiBase().replace(/\/$/, "");
  if (normalized.startsWith(base)) {
    normalized = normalized.slice(base.length).replace(/^\/+/, "");
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;

  return `${base}${normalized}`;
}
