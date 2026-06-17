export const ACHIEVEMENTS_MIN_LEN = 2;
export const ACHIEVEMENTS_MAX_LEN = 2000;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 2000;
export const LIST_SEARCH_MAX_LEN = 120;
export const USER_ID_FILTER_MAX_LEN = 32;
export const IMAGE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
export const LIST_LIMIT = 10;

export function emptyForm() {
  return {
    timeTaken: "",
    achievements: "",
    description: "",
    status: "active",
    userId: "",
  };
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

export function userLabel(row) {
  const u = row?.userId;
  if (!u) return "—";
  if (typeof u === "object") {
    return u.name || u.email || u.phone || "—";
  }
  return String(u);
}

export function userIdFromRow(row) {
  const u = row?.userId;
  if (!u) return "";
  if (typeof u === "object" && u._id) return String(u._id);
  if (typeof u === "object" && u.id) return String(u.id);
  return String(u);
}

export function validateForm(form, { editId, oldFile, newFile, hasExistingImages }) {
  const timeTakenRaw = form.timeTaken;
  const timeTaken = Number(timeTakenRaw);
  if (timeTakenRaw === "" || timeTakenRaw === null || timeTakenRaw === undefined) {
    return "Time taken is required.";
  }
  if (!Number.isFinite(timeTaken) || timeTaken < 0) {
    return "Time taken must be a non-negative number.";
  }

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

  const uid = form.userId.trim();
  if (uid && !/^[a-f\d]{24}$/i.test(uid)) {
    return "User ID must be a valid 24-character hex ObjectId or left empty.";
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
