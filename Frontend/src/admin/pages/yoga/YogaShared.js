import {
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
  validateVideoFileSize,
} from "../../../utils/mediaUploadValidation.js";

export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 35;
export const YT_LINK_MAX_LEN = 500;
export const LIST_SEARCH_MAX_LEN = 50;
export { IMAGE_MAX_SIZE_BYTES, VIDEO_MAX_SIZE_BYTES, validateVideoFileSize };
export const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp", "image/jpg"]);
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v"]);
export const LIST_LIMIT = 10;

export function emptyForm() {
  return {
    title: "",
    type: "ytlink",
    ytLink: "",
    video: "",
    status: "active",
  };
}

export function sanitizeTitle(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\s]/gu, "")
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

export function validateForm(form, { editId, thumbnailFile, hasExistingThumbnail, videoFile, hasExistingVideo }) {
  const title = form.title.trim();
  const type = String(form.type || "").trim();
  const ytLink = form.ytLink.trim();
  const video = form.video.trim();
  const status = String(form.status || "").trim();

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  if (type !== "ytlink" && type !== "video") return "Type must be ytlink or video.";
  if (type === "ytlink" && !ytLink) return "YT link is required when type is ytlink.";
  if (type === "video" && !videoFile && !video && !hasExistingVideo) return "Video file is required when type is video.";
  if (ytLink.length > YT_LINK_MAX_LEN) return `YT link cannot exceed ${YT_LINK_MAX_LEN} characters.`;
  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  if (!editId) {
    if (!(thumbnailFile instanceof File)) return "Please upload a thumbnail image (JPEG, PNG, GIF, or WebP, max 5 MB).";
  } else if (!(thumbnailFile instanceof File) && !hasExistingThumbnail) {
    return "Upload a thumbnail image — this record has no thumbnail yet.";
  }

  if (thumbnailFile instanceof File) {
    if (!ALLOWED_IMAGE_TYPES.has(thumbnailFile.type)) return "Thumbnail must be a JPEG, PNG, GIF, or WebP image.";
    if (thumbnailFile.size > IMAGE_MAX_SIZE_BYTES) return "Thumbnail image must be 5 MB or smaller.";
  }
  if (videoFile instanceof File) {
    if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) {
      return "Video must be MP4, WebM, OGG, MOV, or M4V.";
    }
    const videoErr = validateVideoFileSize(videoFile);
    if (videoErr) return videoErr;
  }

  return "";
}
