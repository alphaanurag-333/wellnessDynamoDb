  export const TITLE_MAX_LEN = 50;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";
export const LIST_LIMIT = 10;

export function emptyForm() {
  return { title: "", status: "active" };
}

export function sanitizeTitleInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, TITLE_MAX_LEN);
}

export function validateBannerForm(form) {
  const title = form.title.trim();
  if (!title) return "Title is required.";
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  return "";
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
