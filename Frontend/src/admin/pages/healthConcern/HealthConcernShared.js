import { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 35;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 255;
export const DESCRIPTION_PREVIEW_LEN = 80;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export { IMAGE_MAX_SIZE_BYTES };
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);

export function emptyForm() {
  return { title: "", description: "", status: "active" };
}

export function sanitizeTitle(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\s]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
}

export function sanitizeDescription(value) {
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

export function validateForm(form, { editId, iconFile, hasExistingIcon }) {
  const title = form.title.trim();
  const description = form.description.trim();
  const status = String(form.status || "").trim();

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;

  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) {
    return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  }
  if (description.length > DESCRIPTION_MAX_LEN) {
    return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  }

  if (status !== "active" && status !== "inactive") {
    return "Status must be active or inactive.";
  }

  if (!editId) {
    if (!(iconFile instanceof File)) {
      return "Please upload an icon image (JPEG, PNG, GIF, or WebP, max 25 MB).";
    }
  } else if (!(iconFile instanceof File) && !hasExistingIcon) {
    return "Upload an icon image — this record has no icon yet.";
  }

  if (iconFile instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.has(iconFile.type)) {
      return "Icon must be a JPEG, PNG, GIF, or WebP image.";
    }
    if (iconFile.size > IMAGE_MAX_SIZE_BYTES) {
      return "Icon image must be 25 MB or smaller.";
    }
  }

  return "";
}
