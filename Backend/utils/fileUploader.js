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
  "audio/wav",
  "audio/ogg",
  "audio/webm",
  "audio/mp4",
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

const uploadLimits = { fileSize: MULTER_MAX_FILE_SIZE_BYTES };

function fileFilter(req, file, cb) {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError("Unsupported file type", 400), false);
  }
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
