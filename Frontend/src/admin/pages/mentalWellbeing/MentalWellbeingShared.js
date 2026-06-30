import { VIDEO_MAX_SIZE_BYTES, validateVideoFileSize } from "../../../utils/mediaUploadValidation.js";

export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 100;
export const YT_LINK_MAX_LEN = 500;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export { VIDEO_MAX_SIZE_BYTES, validateVideoFileSize };
export const MEDIA_MAX_SIZE_MB = 25;
export const MEDIA_MAX_SIZE_BYTES = VIDEO_MAX_SIZE_BYTES;
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v"]);
export const ALLOWED_AUDIO_TYPES = new Set(["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/x-m4a", "audio/mp4", "audio/webm"]);

export function emptyForm() {
  return {
    title: "",
    type: "ytlink",
    ytLink: "",
    status: "active",
  };
}

export function sanitizeTitle(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}\s.,&'+-]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
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

export function typeLabel(type) {
  if (type === "video") return "Video";
  if (type === "audio") return "Audio";
  if (type === "ytlink") return "YT Link";
  return type || "—";
}

export function isAllowedMediaFile(file, type) {
  if (!(file instanceof File)) return false;
  if (type === "audio") {
    if (ALLOWED_AUDIO_TYPES.has(file.type)) return true;
    return !file.type && /\.(mp3|wav|ogg|aac|m4a)$/i.test(String(file.name || ""));
  }
  return ALLOWED_VIDEO_TYPES.has(file.type);
}

export function validateForm(form, { mediaFile, hasExistingFile } = {}) {
  const title = form.title.trim();
  const type = String(form.type || "").trim();
  const ytLink = form.ytLink.trim();
  const status = String(form.status || "").trim();

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  if (type !== "ytlink" && type !== "video" && type !== "audio") return "Type must be ytlink, video, or audio.";

  if (type === "ytlink") {
    if (!ytLink) return "YouTube link is required when type is ytlink.";
    if (ytLink.length > YT_LINK_MAX_LEN) return `YT link cannot exceed ${YT_LINK_MAX_LEN} characters.`;
  } else {
    if (!(mediaFile instanceof File) && !hasExistingFile) {
      return `Please upload ${type === "audio" ? "an audio" : "a video"} file (max ${MEDIA_MAX_SIZE_MB} MB).`;
    }
    if (mediaFile instanceof File) {
      if (!isAllowedMediaFile(mediaFile, type)) {
        return type === "audio"
          ? "Audio must be MP3, WAV, OGG, AAC, or M4A."
          : "Video must be MP4, WebM, OGG, MOV, or M4V.";
      }
      if (mediaFile.size > MEDIA_MAX_SIZE_BYTES) return `File must be ${MEDIA_MAX_SIZE_MB} MB or smaller.`;
    }
  }

  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  return "";
}
