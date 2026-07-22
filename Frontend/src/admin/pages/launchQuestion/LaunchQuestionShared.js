export { formatDate } from "../../utils/formatDate.js";
export const CATEGORY_MIN_LEN = 2;
export const CATEGORY_MAX_LEN = 120;
export const QUESTION_MIN_LEN = 3;
export const QUESTION_MAX_LEN = 500;
export const QUESTION_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export const SORT_ORDER_MIN = 0;
export const SORT_ORDER_MAX = 100000;

export function emptyForm() {
  return {
    category: "",
    question: "",
    sortOrder: 0,
    status: "active",
  };
}

export function sanitizeText(value, maxLen) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, maxLen);
}

export function sanitizeSortOrder(value) {
  const digitsOnly = String(value ?? "").replace(/[^0-9]/g, "");
  if (!digitsOnly) return "";
  const n = Math.min(Number(digitsOnly), SORT_ORDER_MAX);
  return String(n);
}

export function validateSortOrder(value) {
  const raw = String(value ?? "").trim();
  if (raw === "") return "Order is required.";
  if (!/^\d+$/.test(raw)) return "Order must be a whole number.";
  const num = Number.parseInt(raw, 10);
  if (!Number.isFinite(num) || num < SORT_ORDER_MIN) {
    return `Order must be at least ${SORT_ORDER_MIN}.`;
  }
  if (num > SORT_ORDER_MAX) {
    return `Order cannot exceed ${SORT_ORDER_MAX}.`;
  }
  return "";
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}


export function validateForm(form) {
  const category = form.category.trim();
  const question = form.question.trim();
  const status = String(form.status || "").trim();
  const sortOrder = Number(form.sortOrder);

  if (!category) return "Category is required.";
  if (category.length < CATEGORY_MIN_LEN) return `Category must be at least ${CATEGORY_MIN_LEN} characters.`;
  if (category.length > CATEGORY_MAX_LEN) return `Category cannot exceed ${CATEGORY_MAX_LEN} characters.`;
  if (!question) return "Question is required.";
  if (question.length < QUESTION_MIN_LEN) return `Question must be at least ${QUESTION_MIN_LEN} characters.`;
  if (question.length > QUESTION_MAX_LEN) return `Question cannot exceed ${QUESTION_MAX_LEN} characters.`;
  if (form.sortOrder !== "" && !Number.isFinite(sortOrder)) return "Sort order must be a valid number.";
  if (!Number.isInteger(sortOrder)) return "Sort order must be a whole number.";
  if (sortOrder < SORT_ORDER_MIN || sortOrder > SORT_ORDER_MAX) {
    return `Sort order must be between ${SORT_ORDER_MIN} and ${SORT_ORDER_MAX}.`;
  }
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  return "";
}
