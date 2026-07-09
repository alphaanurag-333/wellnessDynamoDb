export const LIST_LIMIT = 10;
export const REVIEW_MIN_LEN = 3;
export const REVIEW_MAX_LEN = 500;
export const SEARCH_MAX_LEN = 50;
export const REVIEW_PREVIEW_LEN = 80;
/** Standard UUID string length (with hyphens). */
export const USER_ID_MAX_LEN = 36;

export function emptyForm() {
  return {
    userId: "",
    review: "",
    stars: "5",
    status: "active",
    approvalStatus: "approved",
  };
}

export function sanitizeReview(value, maxLen = REVIEW_MAX_LEN) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
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

export function approvalLabel(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "Approved";
  if (s === "rejected") return "Rejected";
  return "Pending";
}

export function approvalBadgeClass(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return "admin-status-badge admin-status-badge--active";
  if (s === "rejected") return "admin-status-badge admin-status-badge--inactive";
  return "admin-status-badge";
}

export function healthConcernLabel(row) {
  const title =
    row?.healthConcernTitle ||
    row?.healthConcern?.title ||
    row?.heading ||
    row?.user?.primaryHealthConcern?.title;
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
  return row?.userAvatar || row?.profileImage || row?.user?.profileImage || "";
}
