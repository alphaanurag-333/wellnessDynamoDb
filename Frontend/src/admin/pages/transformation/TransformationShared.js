import { IMAGE_MAX_SIZE_BYTES } from "../../../utils/mediaUploadValidation.js";

export const NAME_MIN_LEN = 2;
export const NAME_MAX_LEN = 35;
export const ACHIEVEMENTS_MIN_LEN = 2;
export const ACHIEVEMENTS_MAX_LEN = 35;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 255;
export const TIME_TAKEN_MIN = 1;
export const TIME_TAKEN_MAX = 120;
export const TIME_TAKEN_MAX_LEN = 3;
export const LIST_SEARCH_MAX_LEN = 50;
export { IMAGE_MAX_SIZE_BYTES };
export const IMAGE_WIDTH = 199;
export const IMAGE_HEIGHT = 251;
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
export const LIST_LIMIT = 10;

export function emptyForm() {
  return {
    name: "",
    timeTaken: "",
    achievements: "",
    description: "",
    status: "active",
  };
}

export function sanitizeName(value) {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .slice(0, NAME_MAX_LEN);
}

export function sanitizeAchievements(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, ACHIEVEMENTS_MAX_LEN);
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

/** Whole months only — digits capped at TIME_TAKEN_MAX_LEN and value at TIME_TAKEN_MAX. */
export function sanitizeTimeTakenMonths(raw) {
  const digits = String(raw ?? "").replace(/\D/g, "").slice(0, TIME_TAKEN_MAX_LEN);
  if (!digits) return "";
  const num = Number.parseInt(digits, 10);
  if (!Number.isFinite(num)) return "";
  return String(Math.min(TIME_TAKEN_MAX, num));
}

export function validateTimeTakenMonths(value) {
  const raw = String(value ?? "").trim();
  if (!raw) return "Time taken is required.";
  if (!/^\d+$/.test(raw)) return "Time taken must be a whole number of months.";
  const num = Number.parseInt(raw, 10);
  if (!Number.isFinite(num) || num < TIME_TAKEN_MIN) {
    return `Time taken must be at least ${TIME_TAKEN_MIN} month.`;
  }
  if (num > TIME_TAKEN_MAX) {
    return `Time taken cannot exceed ${TIME_TAKEN_MAX} months.`;
  }
  return "";
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

export function validateForm(form, { editId, oldFile, newFile, hasExistingImages }) {
  const name = form.name.trim();
  if (!name) return "Name is required.";
  if (name.length < NAME_MIN_LEN) {
    return `Name must be at least ${NAME_MIN_LEN} characters.`;
  }
  if (name.length > NAME_MAX_LEN) {
    return `Name cannot exceed ${NAME_MAX_LEN} characters.`;
  }

  const timeTakenErr = validateTimeTakenMonths(form.timeTaken);
  if (timeTakenErr) return timeTakenErr;

  const achievements = form.achievements.trim();
  const description = form.description.trim();
  const status = String(form.status || "").trim();

  if (!achievements) return "Achievements is required.";
  if (achievements.length < ACHIEVEMENTS_MIN_LEN) {
    return `Achievements must be at least ${ACHIEVEMENTS_MIN_LEN} characters.`;
  }
  if (achievements.length > ACHIEVEMENTS_MAX_LEN) {
    return `Achievements cannot exceed ${ACHIEVEMENTS_MAX_LEN} characters.`;
  }

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
    if (!(oldFile instanceof File) || !(newFile instanceof File)) {
      return "Please upload both before and after images (JPEG, PNG, GIF, or WebP, max 5 MB each).";
    }
  } else if (!(oldFile instanceof File) && !(newFile instanceof File) && !hasExistingImages) {
    return "This record is missing images; upload before and after images.";
  }

  for (const file of [oldFile, newFile]) {
    if (file instanceof File) {
      if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
        return "Images must be JPEG, PNG, GIF, or WebP.";
      }
      if (file.size > IMAGE_MAX_SIZE_BYTES) {
        return "Each image must be 5 MB or smaller.";
      }
    }
  }

  return "";
}
