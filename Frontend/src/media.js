import { getApiBase } from "./api.js";

export function mediaUrl(path) {
  if (!path) return "";
  if (String(path).startsWith("http")) return String(path);
  const p = String(path);
  return `${getApiBase()}${p.startsWith("/") ? "" : "/"}${p}`;
}
