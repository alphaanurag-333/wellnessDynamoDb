import {
  IMAGE_MAX_SIZE_BYTES,
  IMAGE_MAX_SIZE_MB,
} from "../../../utils/mediaUploadValidation.js";

export const TITLE_MAX_LEN = 35;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 255;
export const DESCRIPTION_PREVIEW_LEN = 80;

/** Website desktop hero banner crop — wide landscape */
export const IMAGE_WIDTH = 1905;
export const IMAGE_HEIGHT = 640;

/**
 * Mobile web + app banner crop.
 * Matches phone strip (~full width × 180px app carousel) and mobile site hero.
 */
export const MOBILE_IMAGE_WIDTH = 1080;
export const MOBILE_IMAGE_HEIGHT = 480;

export const BANNER_TYPE_MAIN = "main";
export const BANNER_TYPE_WELLNESSPEDIA = "wellnesspedia";

export const BANNER_TYPE_OPTIONS = [
  { value: BANNER_TYPE_MAIN, label: "Main banner" },
  { value: BANNER_TYPE_WELLNESSPEDIA, label: "Wellnesspedia banner" },
];

export const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/jpg",
]);

export { IMAGE_MAX_SIZE_BYTES, IMAGE_MAX_SIZE_MB };
export const LIST_LIMIT = 10;
export const LIST_SEARCH_MAX_LEN = 50;

export function emptyForm() {
  return {
    title: "",
    description: "",
    status: "active",
    bannerType: BANNER_TYPE_MAIN,
  };
}

export function bannerTypeLabel(value) {
  const key = String(value || BANNER_TYPE_MAIN).toLowerCase();
  return BANNER_TYPE_OPTIONS.find((opt) => opt.value === key)?.label || "Main banner";
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

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

export function validateBannerForm(form) {
  const title = form.title.trim();
  const description = form.description.trim();
  const bannerType = String(form.bannerType || "").trim().toLowerCase();

  if (!title) return "Title is required.";
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;

  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) {
    return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  }
  if (description.length > DESCRIPTION_MAX_LEN) {
    return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  }

  if (!BANNER_TYPE_OPTIONS.some((opt) => opt.value === bannerType)) {
    return "Banner type must be Main banner or Wellnesspedia banner.";
  }

  return "";
}

export function formatDate(value) {
  if (!value) return "—";
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(value).toLocaleString();
}
