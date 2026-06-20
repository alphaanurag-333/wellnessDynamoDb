const path = require("path");
const { randomUUID } = require("crypto");
const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const config = require("../config");
const AppError = require("./AppError");
const { assertUploadFileSize } = require("./mediaUploadLimits");

const s3Client = new S3Client({
  region: config.awsRegion,
  credentials:
    config.awsAccessKeyId && config.awsSecretAccessKey
      ? {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        }
      : undefined,
});

function assertS3Configured() {
  if (!config.awsS3BucketName) {
    throw new AppError("AWS_S3_BUCKET_NAME is not configured", 500);
  }
  if (!(config.awsS3PublicBaseUrl || "").trim()) {
    throw new AppError("AWS_S3_PUBLIC_BASE_URL is not configured", 500);
  }
}

function getPublicBaseUrl() {
  return config.awsS3PublicBaseUrl.trim().replace(/\/$/, "");
}

function encodeKeyForUrl(key) {
  return key.split("/").map(encodeURIComponent).join("/");
}

/** Extract object key from our S3/CDN public URL, or null if not ours. */
function parseKeyFromS3PublicUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== "string") return null;

  const withoutQuery = String(publicUrl).trim().split("?")[0];
  const base = (config.awsS3PublicBaseUrl || "").trim().replace(/\/$/, "");

  if (base && withoutQuery.startsWith(`${base}/`)) {
    return decodeURIComponent(withoutQuery.slice(base.length + 1));
  }

  if (!config.awsS3BucketName) return null;

  try {
    const pathname = new URL(withoutQuery).pathname.replace(/^\/+/, "");
    const bucket = config.awsS3BucketName;
    if (pathname.startsWith(`${bucket}/`)) {
      return decodeURIComponent(pathname.slice(bucket.length + 1));
    }
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

/** DB value: S3 object key only (e.g. user/photo.jpg). */
function normalizeStoredMedia(key) {
  if (key === undefined || key === null) return null;
  const raw = String(key).trim();
  if (!raw) return null;

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return parseKeyFromS3PublicUrl(raw);
  }

  const value = raw.replace(/^\/+/, "");
  if (!value || value.includes("..")) return null;
  return value;
}

/** API response: key → public URL using AWS_S3_PUBLIC_BASE_URL. */
function resolvePublicUrl(key) {
  const stored = normalizeStoredMedia(key);
  if (!stored) return null;
  return `${getPublicBaseUrl()}/${encodeKeyForUrl(stored)}`;
}

async function uploadBufferToS3({ buffer, contentType, folder, originalName }) {
  assertS3Configured();

  const ext = path.extname(originalName || "").toLowerCase();
  const objectKey = `${folder}/${Date.now()}-${randomUUID()}${ext}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: config.awsS3BucketName,
      Key: objectKey,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
    })
  );

  return objectKey;
}

async function uploadFileFromRequest(req, folder) {
  if (!req?.file?.buffer) return undefined;

  return uploadMulterFile(req.file, folder);
}

async function uploadMulterField(req, field, folder) {
  const file = req.files?.[field]?.[0];
  return uploadMulterFile(file, folder);
}

async function uploadMulterFile(file, folder) {
  if (!file?.buffer) return undefined;

  assertUploadFileSize(file);

  return uploadBufferToS3({
    buffer: file.buffer,
    contentType: file.mimetype,
    folder,
    originalName: file.originalname,
  });
}

function normalizeMediaField(value, fieldName = "media") {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error(`${fieldName} must be a valid S3 object key`);
  }
  return objectKey;
}

function normalizeNullableMediaField(value, fieldName = "media") {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error(`${fieldName} must be a valid S3 object key`);
  }
  return objectKey;
}

function resolveMediaFields(item, fields) {
  if (!item) return item;
  const pub = { ...item };
  for (const field of fields) {
    if (pub[field]) pub[field] = resolvePublicUrl(pub[field]);
  }
  return pub;
}

function parseMediaKeyFromBody(value, fieldName = "image") {
  if (value === undefined) return undefined;
  if (value === null || String(value).trim() === "") return null;

  const raw = String(value).trim();
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    const key = parseKeyFromS3PublicUrl(raw);
    if (key) return key;
    throw new AppError(
      `${fieldName} must be an S3 object key or your uploaded file URL, not an external link`,
      400
    );
  }

  const key = normalizeStoredMedia(raw);
  if (!key) throw new AppError(`${fieldName} is invalid`, 400);
  return key;
}

async function deleteStoredMedia(key) {
  const objectKey = normalizeStoredMedia(key);
  if (!objectKey) return;

  assertS3Configured();
  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: config.awsS3BucketName,
        Key: objectKey,
      })
    );
  } catch {
    /* ignore */
  }
}

module.exports = {
  s3Client,
  getPublicBaseUrl,
  parseKeyFromS3PublicUrl,
  normalizeStoredMedia,
  normalizeMediaField,
  normalizeNullableMediaField,
  resolvePublicUrl,
  resolveMediaFields,
  parseMediaKeyFromBody,
  uploadBufferToS3,
  uploadMulterFile,
  uploadMulterField,
  uploadFileFromRequest,
  deleteStoredMedia,
};
