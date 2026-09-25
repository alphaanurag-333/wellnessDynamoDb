const multer = require("multer");
const path = require("path");
const fs = require("fs");
const AppError = require("./AppError");
const { MULTER_MAX_FILE_SIZE_BYTES } = require("./mediaUploadLimits");

const allowedTypes = [
  // Images
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  // Video
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  // Audio
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  // Archives
  "application/zip",
  "application/x-zip-compressed",
];

/** Extension → MIME when clients send octet-stream / blank Content-Type (common on mobile). */
const EXT_TO_MIME = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".mp4": "video/mp4",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime",
  ".avi": "video/x-msvideo",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain",
  ".zip": "application/zip",
};

const GENERIC_MIMES = new Set([
  "",
  "application/octet-stream",
  "binary/octet-stream",
  "octet-stream",
]);

const uploadLimits = { fileSize: MULTER_MAX_FILE_SIZE_BYTES };

function normalizeMime(value) {
  return String(value || "").toLowerCase().trim();
}

function mimeFromFilename(filename) {
  const ext = path.extname(String(filename || "")).toLowerCase();
  return EXT_TO_MIME[ext] || "";
}

function resolveUploadMime(file) {
  const mime = normalizeMime(file?.mimetype);
  if (allowedTypes.includes(mime)) return mime;

  // Clients (esp. apps) often send .mp4 as binary/octet-stream — trust known extension.
  if (GENERIC_MIMES.has(mime)) {
    const inferred = mimeFromFilename(file?.originalname);
    if (inferred && allowedTypes.includes(inferred)) return inferred;
  }

  return "";
}

function fileFilter(req, file, cb) {
  const resolved = resolveUploadMime(file);
  if (resolved) {
    // Fix Content-Type for S3 / downstream so video/mp4 is stored correctly.
    file.mimetype = resolved;
    cb(null, true);
    return;
  }

  const mime = normalizeMime(file?.mimetype);
  const name = String(file?.originalname || "file").trim() || "file";
  cb(
    new AppError(
      `Unsupported file type${mime ? ` (${mime})` : ""} for ${name}. Allowed: images (jpg/png/gif/webp/svg), video (mp4/mov/avi/webm), audio, PDF, Office docs, txt, zip.`,
      400
    ),
    false
  );
}

function createUploader(folderName = "") {
  const uploadPath = path.join("uploads", folderName);

  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname.replace("[]", "") + "-" + uniqueSuffix + ext);
    },
  });

  return multer({
    storage,
    fileFilter,
    limits: uploadLimits,
  });
}

/** In-memory multer for S3 uploads (req.file.buffer). */
function createMemoryUploader() {
  return multer({
    storage: multer.memoryStorage(),
    fileFilter,
    limits: uploadLimits,
  });
}

module.exports = createUploader;
module.exports.createMemoryUploader = createMemoryUploader;
module.exports.resolveUploadMime = resolveUploadMime;
