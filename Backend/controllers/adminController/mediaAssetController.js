const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const { isImageMime, isVideoMime, isAudioMime } = require("../../utils/mediaUploadLimits");
const {
  createMediaAsset,
  getMediaAssetById,
  getMediaAssetRecordById,
  updateMediaAsset,
  deleteMediaAsset,
  listMediaAssets,
  restoreMediaAssetVersion,
  snapshotCurrentVersion,
  collectMediaAssetFiles,
  normalizeHistoryList,
  normalizeStatus,
  normalizeType,
  formatFileSize,
  TYPES,
} = require("../../models/mediaAssetModel");

const S3_FOLDER = "media-assets";

function resolveOwner(req) {
  return String(req.body.owner || req.account?.name || req.user?.name || "Admin").trim() || "Admin";
}

function resolveUploadedFile(req) {
  return req.files?.file?.[0] || req.file || null;
}

function resolveUploadedFileMeta(req) {
  const file = resolveUploadedFile(req);
  if (!file) return { fileSizeBytes: 0, fileSize: "" };
  const fileSizeBytes = Number(file.size) || 0;
  return {
    fileSizeBytes,
    fileSize: formatFileSize(fileSizeBytes),
  };
}

function inferTypeFromMime(mimetype, fallback = "image") {
  if (isAudioMime(mimetype)) return "audio";
  if (isVideoMime(mimetype)) return "video";
  if (isImageMime(mimetype)) return "image";
  return normalizeType(fallback, "image");
}

function resolveType(req) {
  const bodyType = String(req.body.type || "").trim().toLowerCase();
  if (TYPES.has(bodyType)) return bodyType;
  const file = resolveUploadedFile(req);
  if (file?.mimetype) return inferTypeFromMime(file.mimetype);
  return "image";
}

exports.listMediaAssetsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, owner, search, type, category, from, to } = req.query;
  const data = await listMediaAssets({
    page,
    limit,
    status,
    owner,
    search,
    type,
    category,
    from,
    to,
  });
  return res.status(200).json({
    status: true,
    media: data.media,
    pagination: data.pagination,
  });
});

exports.getMediaAssetByIdController = asyncHandler(async (req, res) => {
  const media = await getMediaAssetById(req.params.id);
  if (!media) throw new AppError("Media asset not found", 404);
  return res.status(200).json({ status: true, media });
});

exports.createMediaAssetController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "Media asset").trim() || "Media asset";
  const owner = resolveOwner(req);
  const status = normalizeStatus(req.body.status, "inactive");
  const type = resolveType(req);
  const category = String(req.body.category || "").trim();
  const duration = String(req.body.duration || "").trim();
  const uploadedFile = await uploadMulterField(req, "file", S3_FOLDER);
  const file = uploadedFile ?? parseMediaKeyFromBody(req.body.file, "file");
  const { fileSizeBytes, fileSize } = resolveUploadedFileMeta(req);

  if (!file) throw new AppError("file is required", 400);
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  if (!TYPES.has(type)) {
    throw new AppError("type must be image, video, or audio", 400);
  }

  const media = await createMediaAsset({
    title,
    owner,
    type,
    file,
    status,
    category,
    duration,
    fileSize,
    fileSizeBytes,
  });

  return res.status(201).json({
    status: true,
    message: "Media asset uploaded successfully",
    media,
  });
});

exports.updateMediaAssetController = asyncHandler(async (req, res) => {
  const current = await getMediaAssetRecordById(req.params.id);
  if (!current) throw new AppError("Media asset not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.owner !== undefined) {
    updates.owner = String(req.body.owner || "Admin").trim() || "Admin";
  }
  if (req.body.status !== undefined) {
    const status = normalizeStatus(req.body.status, "");
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.type !== undefined) {
    const type = normalizeType(req.body.type, "");
    if (!TYPES.has(type)) {
      throw new AppError("type must be image, video, or audio", 400);
    }
    updates.type = type;
  }
  if (req.body.category !== undefined) {
    updates.category = String(req.body.category || "").trim();
  }
  if (req.body.duration !== undefined) {
    updates.duration = String(req.body.duration || "").trim();
  }
  if (req.body.file !== undefined) {
    updates.file = parseMediaKeyFromBody(req.body.file, "file") ?? "";
  }

  const uploadedFile = await uploadMulterField(req, "file", S3_FOLDER);
  if (uploadedFile) {
    const currentSnap = snapshotCurrentVersion(current);
    const prevHistory = normalizeHistoryList(current.history);
    if (currentSnap && currentSnap.file !== uploadedFile) {
      updates.history = [currentSnap, ...prevHistory].slice(0, 30);
    }
    // Keep previous S3 object for history/download/restore.
    updates.file = uploadedFile;
    updates.versions = (Number(current.versions) || 1) + 1;
    const uploaded = resolveUploadedFile(req);
    if (uploaded?.mimetype && req.body.type === undefined) {
      updates.type = inferTypeFromMime(uploaded.mimetype, current.type || "image");
    }
    const { fileSizeBytes, fileSize } = resolveUploadedFileMeta(req);
    if (fileSizeBytes) {
      updates.fileSizeBytes = fileSizeBytes;
      updates.fileSize = fileSize;
    }
    if (req.body.owner === undefined) {
      updates.owner = resolveOwner(req);
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let media;
  try {
    media = await updateMediaAsset(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Media asset not found", 404);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Media asset updated successfully",
    media,
  });
});

exports.restoreMediaAssetVersionController = asyncHandler(async (req, res) => {
  const versionN = Number(req.body.version ?? req.params.version);
  if (!Number.isFinite(versionN) || versionN < 1) {
    throw new AppError("version is required", 400);
  }

  let media;
  try {
    media = await restoreMediaAssetVersion(req.params.id, versionN);
  } catch (err) {
    if (err?.message === "VERSION_NOT_FOUND") throw new AppError("Version not found", 404);
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Media asset not found", 404);
    throw err;
  }
  if (!media) throw new AppError("Media asset not found", 404);

  return res.status(200).json({
    status: true,
    message: "Media version restored successfully",
    media,
  });
});

exports.deleteMediaAssetController = asyncHandler(async (req, res) => {
  const current = await getMediaAssetRecordById(req.params.id);
  if (!current) throw new AppError("Media asset not found", 404);
  if (current.status === "active") {
    throw new AppError("Live media must be unmarked before delete", 400);
  }

  for (const key of collectMediaAssetFiles(current)) {
    await deleteStoredMedia(key);
  }

  try {
    await deleteMediaAsset(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Media asset not found", 404);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Media asset deleted successfully",
  });
});
