export const LIST_LIMIT = 10;
export const NAME_MAX_LEN = 35;
export const REVIEW_MIN_LEN = 3;
export const REVIEW_MAX_LEN = 500;
export const REVIEW_PREVIEW_LEN = 80;
export const SEARCH_MAX_LEN = 50;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return {
    name: "",
    stars: "5",
    review: "",
    healthConcernId: "",
    status: "active",
  };
}

export function sanitizeSingleLine(value, maxLen) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, maxLen);
}

export function sanitizeReview(value, maxLen = REVIEW_MAX_LEN) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\b[\w-]+\.(?:com|net|org|in|io|co|info|biz|gov|edu|app|dev|me|us|uk|xyz)\b\S*/gi, "")
    .replace(/[^\p{L}\p{N}\s.,!?'"():;\-]/gu, "")
    .slice(0, maxLen);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function healthConcernLabel(row) {
  const title =
    row?.healthConcernTitle ||
    row?.healthConcern?.title ||
    row?.heading;
  return title ? String(title) : "—";
}

export function reviewText(row) {
  const text = row?.review ?? row?.content;
  return text ? String(text) : "—";
}

export function starsValue(row) {
  const n = row?.stars ?? row?.rating;
  return n != null && n !== "" ? n : "—";
}

export function testimonialAvatarPath(row) {
  return row?.profileImage || row?.userAvatar || row?.user?.profileImage || "";
}

export function displayName(row) {
  return String(row?.name || row?.userName || row?.user?.name || "").trim() || "—";
}
