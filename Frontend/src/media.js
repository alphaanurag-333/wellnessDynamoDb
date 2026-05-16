import { getApiBase } from "./api.js";

export { DEFAULT_IMAGE_SRC, handleMediaImageError, resolveMediaImageSrc } from "./components/AdminMediaImage.jsx";

/** Normalize stored upload paths and build absolute media URLs. */
export function mediaUrl(path) {
  if (path == null || path === "") return "";
  const raw = String(path).trim();
  if (!raw) return "";

  if (raw.startsWith("blob:") || raw.startsWith("data:")) return raw;
  if (/^https?:\/\//i.test(raw)) return raw;

  const base = getApiBase().replace(/\/$/, "");
  let normalized = raw.replace(/\\/g, "/");

  if (normalized.startsWith(base)) {
    normalized = normalized.slice(base.length);
  }
  if (!normalized.startsWith("/")) normalized = `/${normalized}`;

  return `${base}${normalized}`;
}
