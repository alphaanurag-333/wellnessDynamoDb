export const IMAGE_MAX_SIZE_MB = 5;
export const VIDEO_MAX_SIZE_MB = 25;
export const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;
export const VIDEO_MAX_SIZE_BYTES = VIDEO_MAX_SIZE_MB * 1024 * 1024;

export function isImageMime(mimetype) {
  return String(mimetype || "").startsWith("image/");
}

export function isVideoMime(mimetype) {
  return String(mimetype || "").startsWith("video/");
}

export function getMaxBytesForMime(mimetype) {
  if (isVideoMime(mimetype)) return VIDEO_MAX_SIZE_BYTES;
  if (isImageMime(mimetype)) return IMAGE_MAX_SIZE_BYTES;
  return VIDEO_MAX_SIZE_BYTES;
}

export function validateImageFileSize(file) {
  if (!(file instanceof File)) return "";
  if (file.size > IMAGE_MAX_SIZE_BYTES) {
    return `Image must be ${IMAGE_MAX_SIZE_MB} MB or smaller.`;
  }
  return "";
}

export function validateVideoFileSize(file) {
  if (!(file instanceof File)) return "";
  if (file.size > VIDEO_MAX_SIZE_BYTES) {
    return `Video must be ${VIDEO_MAX_SIZE_MB} MB or smaller.`;
  }
  return "";
}
