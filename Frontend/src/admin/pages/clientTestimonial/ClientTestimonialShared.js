export const LIST_LIMIT = 10;
export const NAME_MAX_LEN = 35;
export const DESCRIPTION_MAX_LEN = 500;
export const SEARCH_MAX_LEN = 50;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return { name: "", rating: "5", description: "", status: "active" };
}

export function sanitizeSingleLine(value, maxLen) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, maxLen);
}

export function sanitizeMultiLine(value, maxLen) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, maxLen);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
