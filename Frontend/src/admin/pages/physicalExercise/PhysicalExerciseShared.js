import { VIDEO_MAX_SIZE_BYTES, validateVideoFileSize } from "../../../utils/mediaUploadValidation.js";

export { formatDate } from "../../utils/formatDate.js";
export const TITLE_MIN_LEN = 2;
export const TITLE_MAX_LEN = 35;
export const DESCRIPTION_MIN_LEN = 5;
export const DESCRIPTION_MAX_LEN = 255;
export const LINK_MAX_LEN = 200;
export const LIST_SEARCH_MAX_LEN = 50;
export const LIST_LIMIT = 10;
export { VIDEO_MAX_SIZE_BYTES, validateVideoFileSize };
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/ogg", "video/quicktime", "video/x-m4v"]);

export function emptyForm() {
  return {
    title: "",
    description: "",
    type: "ytlink",
    link: "",
    status: "active",
  };
}

export function sanitizeTitle(value) {
  return String(value ?? "")
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ")
    .slice(0, TITLE_MAX_LEN);
}

export function sanitizeDescription(value) {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\p{L}\p{N}\s.,!?'"():;\-]/gu, "")
    .slice(0, DESCRIPTION_MAX_LEN);
}

export function truncate(str, max) {
  const s = String(str ?? "");
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}


export function validateForm(form, { videoFile, hasExistingVideo } = {}) {
  const title = form.title.trim();
  const description = form.description.trim();
  const type = String(form.type || "").trim();
  const link = form.link.trim();
  const status = String(form.status || "").trim();

  if (!title) return "Title is required.";
  if (title.length < TITLE_MIN_LEN) return `Title must be at least ${TITLE_MIN_LEN} characters.`;
  if (title.length > TITLE_MAX_LEN) return `Title cannot exceed ${TITLE_MAX_LEN} characters.`;
  if (!description) return "Description is required.";
  if (description.length < DESCRIPTION_MIN_LEN) return `Description must be at least ${DESCRIPTION_MIN_LEN} characters.`;
  if (description.length > DESCRIPTION_MAX_LEN) return `Description cannot exceed ${DESCRIPTION_MAX_LEN} characters.`;
  if (type !== "ytlink" && type !== "video") return "Type must be ytlink or video.";

  if (type === "ytlink") {
    if (!link) return "YouTube link is required when type is ytlink.";
    if (link.length > LINK_MAX_LEN) return `Link cannot exceed ${LINK_MAX_LEN} characters.`;
  } else {
    if (!(videoFile instanceof File) && !hasExistingVideo) {
      return "Please upload a video file (MP4, WebM, OGG, MOV, or M4V, max 25 MB).";
    }
    if (videoFile instanceof File) {
      if (!ALLOWED_VIDEO_TYPES.has(videoFile.type)) return "Video must be MP4, WebM, OGG, MOV, or M4V.";
      const videoErr = validateVideoFileSize(videoFile);
      if (videoErr) return videoErr;
    }
  }

  if (status !== "active" && status !== "inactive") return "Status must be active or inactive.";

  return "";
}
