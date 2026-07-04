import { PRAKRUTI_TYPES } from "../../../components/prakrutiShared.js";

export const TITLE_MIN_LEN = 3;
export const TITLE_MAX_LEN = 300;
export const TITLE_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 100000;

const PRAKRUTI_TYPE_SET = new Set(PRAKRUTI_TYPES.map((row) => row.value));

export function emptyForm() {
  return { prakrutiType: "", title: "", sortOrder: 0, status: "active" };
}

export function sanitizeTitle(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
}

export function sanitizeSortOrder(value) {
  const digitsOnly = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digitsOnly) return "";
  const n = Math.min(Number(digitsOnly), SORT_ORDER_MAX);
  return String(n);
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}

export function validateForm(form) {
  const prakrutiType = String(form.prakrutiType || "").trim();
  const title = form.title.trim();
  const status = String(form.status || "").trim();
  const sortOrder = Number(form.sortOrder);

  if (!prakrutiType) return "Prakruti type is required.";
  if (!PRAKRUTI_TYPE_SET.has(prakrutiType)) return "Select a valid Prakruti type.";
  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  if (form.sortOrder !== "" && !Number.isFinite(sortOrder)) return "Sort order must be a valid number.";
  if (!Number.isInteger(sortOrder)) return "Sort order must be a whole number.";
  if (sortOrder < SORT_ORDER_MIN || sortOrder > SORT_ORDER_MAX) {
    return `Sort order must be between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}.`;
  }
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  return "";
}
