export { formatDateTime } from "../../utils/formatDate.js";
export const LIST_LIMIT = 10;
export const NAME_MAX_LEN = 80;
export const DESIGNATION_MAX_LEN = 120;
export const TITLE_MAX_LEN = 120;
export const BADGE_MAX_LEN = 60;
export const MESSAGE_MAX_LEN = 5000;
export const MESSAGE_PREVIEW_LEN = 80;
export const SEARCH_MAX_LEN = 50;
export const DEFAULT_BADGE = "A NOTE FROM LEADERSHIP";
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export function emptyForm() {
  return {
    name: "",
    designation: "",
    title: "",
    badge: DEFAULT_BADGE,
    message: "",
    status: "active",
  };
}

export function sanitizeSingleLine(value, maxLen) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, maxLen);
}

export function sanitizeMessage(value, maxLen) {
  return String(value ?? "").slice(0, maxLen);
}

