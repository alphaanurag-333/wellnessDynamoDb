const AppError = require("./AppError");

const IMAGE_MAX_SIZE_MB = 5;
const VIDEO_MAX_SIZE_MB = 25;
const IMAGE_MAX_SIZE_BYTES = IMAGE_MAX_SIZE_MB * 1024 * 1024;
const VIDEO_MAX_SIZE_BYTES = VIDEO_MAX_SIZE_MB * 1024 * 1024;
const MULTER_MAX_FILE_SIZE_BYTES = VIDEO_MAX_SIZE_BYTES;

function isImageMime(mimetype) {
  return String(mimetype || "").startsWith("image/");
}

function isVideoMime(mimetype) {
  return String(mimetype || "").startsWith("video/");
}

function getMaxBytesForMime(mimetype) {
  if (isVideoMime(mimetype)) return VIDEO_MAX_SIZE_BYTES;
  if (isImageMime(mimetype)) return IMAGE_MAX_SIZE_BYTES;
  return VIDEO_MAX_SIZE_BYTES;
}

function assertUploadFileSize(file) {
  if (!file?.buffer) return;

  const maxBytes = getMaxBytesForMime(file.mimetype);
  if (file.size > maxBytes) {
    const kind = isVideoMime(file.mimetype) ? "Video" : isImageMime(file.mimetype) ? "Image" : "File";
    const maxMb = maxBytes / (1024 * 1024);
    throw new AppError(`${kind} must be ${maxMb} MB or smaller`, 413);
  }
}

function multerFileSizeErrorMessage(err) {
  if (err?.code !== "LIMIT_FILE_SIZE") return err?.message || "Upload failed";
  return `File must be ${VIDEO_MAX_SIZE_MB} MB or smaller`;
}

module.exports = {
  IMAGE_MAX_SIZE_MB,
  VIDEO_MAX_SIZE_MB,
  IMAGE_MAX_SIZE_BYTES,
  VIDEO_MAX_SIZE_BYTES,
  MULTER_MAX_FILE_SIZE_BYTES,
  assertUploadFileSize,
  multerFileSizeErrorMessage,
};
