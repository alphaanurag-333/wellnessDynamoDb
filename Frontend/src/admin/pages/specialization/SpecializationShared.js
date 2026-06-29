export const TITLE_MAX_LEN = 35;
export const DESCRIPTION_MAX_LEN = 255;
export const TITLE_PREVIEW_LEN = 50;
export const DESCRIPTION_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;

export function emptyForm() {
  return { title: "", description: "", status: "active" };
}

export function sanitizeTitleInput(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
}

export function sanitizeDescriptionInput(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/www\.\S+/gi, "")
    .replace(/\b[\w-]+\.(?:com|net|org|in|io|co|info|biz|gov|edu|app|dev|me|us|uk|xyz)\b\S*/gi, "")
    .replace(/[^\p{L}\p{N}\s.,!?'"():;\-]/gu, "")
    .slice(0, DESCRIPTION_MAX_LEN);
}

export function validateSpecializationForm(form) {
  const title = String(form.title ?? "").trim();
  const description = String(form.description ?? "").trim();
  if (!title) return "Title is required.";
  if (title.length > TITLE_MAX_LEN) {
    return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  }
  if (description.length > DESCRIPTION_MAX_LEN) {
    return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  }
  const status = String(form.status || "").trim();
  if (status && status !== "active" && status !== "inactive") {
    return "Status must be active or inactive.";
  }
  return "";
}

export function truncateText(value, maxLen) {
  const text = String(value ?? "").trim();
  if (!text) return "—";
  return text.length > maxLen ? `${text.slice(0, maxLen)}...` : text;
}

export function getSpecializationId(row) {
  return row?.id || row?._id || "";
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
