const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createBlogMedia,
  getBlogMediaById,
  getBlogMediaRecordById,
  updateBlogMedia,
  deleteBlogMedia,
  listBlogMedia,
  normalizeStatus,
  formatFileSize,
} = require("../../models/blogMediaModel");

const S3_FOLDER = "blog-media";

function resolveOwner(req) {
  return String(req.body.owner || req.account?.name || req.user?.name || "Admin").trim() || "Admin";
}

function resolveUploadedFileMeta(req) {
  const file =
    req.files?.file?.[0] ||
    req.files?.coverFile?.[0] ||
    req.file ||
    null;
  if (!file) return { fileSizeBytes: 0, fileSize: "" };
  const fileSizeBytes = Number(file.size) || 0;
  return {
    fileSizeBytes,
    fileSize: formatFileSize(fileSizeBytes),
  };
}

exports.listBlogMediaController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, status, owner, search } = req.query;
  const data = await listBlogMedia({ page, limit, status, owner, search });
  return res.status(200).json({
    status: true,
    media: data.media,
    pagination: data.pagination,
  });
});

exports.getBlogMediaByIdController = asyncHandler(async (req, res) => {
  const media = await getBlogMediaById(req.params.id);
  if (!media) throw new AppError("Blog media not found", 404);
  return res.status(200).json({ status: true, media });
});

exports.createBlogMediaController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "Blog cover").trim() || "Blog cover";
  const owner = resolveOwner(req);
  const status = normalizeStatus(req.body.status, "inactive");
  const uploadedImage =
    (await uploadMulterField(req, "file", S3_FOLDER)) ||
    (await uploadMulterField(req, "coverFile", S3_FOLDER));
  const image = uploadedImage ?? parseMediaKeyFromBody(req.body.image, "image");
  const { fileSizeBytes, fileSize } = resolveUploadedFileMeta(req);

  if (!image) throw new AppError("image is required", 400);
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const media = await createBlogMedia({
    title,
    owner,
    image,
    status,
    fileSize,
    fileSizeBytes,
  });

  return res.status(201).json({
    status: true,
    message: "Blog media uploaded successfully",
    media,
  });
});

exports.updateBlogMediaController = asyncHandler(async (req, res) => {
  const current = await getBlogMediaRecordById(req.params.id);
  if (!current) throw new AppError("Blog media not found", 404);

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
  if (req.body.image !== undefined) {
    updates.image = parseMediaKeyFromBody(req.body.image, "image") ?? "";
  }

  const uploadedImage =
    (await uploadMulterField(req, "file", S3_FOLDER)) ||
    (await uploadMulterField(req, "coverFile", S3_FOLDER));
  if (uploadedImage) {
    if (current.image && current.image !== uploadedImage) {
      await deleteStoredMedia(current.image);
    }
    updates.image = uploadedImage;
    updates.versions = (Number(current.versions) || 1) + 1;
    const { fileSizeBytes, fileSize } = resolveUploadedFileMeta(req);
    if (fileSizeBytes) {
      updates.fileSizeBytes = fileSizeBytes;
      updates.fileSize = fileSize;
    }
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let media;
  try {
    media = await updateBlogMedia(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Blog media not found", 404);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Blog media updated successfully",
    media,
  });
});

exports.deleteBlogMediaController = asyncHandler(async (req, res) => {
  const current = await getBlogMediaRecordById(req.params.id);
  if (!current) throw new AppError("Blog media not found", 404);
  if (current.status === "active") {
    throw new AppError("Live media must be unmarked before delete", 400);
  }
  if (current.image) await deleteStoredMedia(current.image);

  try {
    await deleteBlogMedia(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Blog media not found", 404);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Blog media deleted successfully",
  });
});
