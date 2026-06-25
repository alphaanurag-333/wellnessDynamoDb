export const LIST_LIMIT = 10;
export { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";
export const MESSAGE_MAX_LEN = 1000;

export const NOTIFICATION_AUDIENCE = "users";

export function emptyForm() {
  return { audienceType: NOTIFICATION_AUDIENCE, message: "", status: "active" };
}

export function sanitizeMessageInput(value) {
  return String(value ?? "").replace(/\s+/g, " ").slice(0, MESSAGE_MAX_LEN);
}

export function formatDateTime(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
