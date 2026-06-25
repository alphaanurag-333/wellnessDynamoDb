const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createBanner,
  getBannerById,
  getBannerRecordById,
  updateBanner,
  deleteBanner,
  listBanners,
} = require("../../models/bannerModel");

const S3_FOLDER = "banner";

exports.listBannersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search } = req.query;
  const data = await listBanners({ page, limit, status, search });
  return res.status(200).json({ status: true, banners: data.banners, pagination: data.pagination });
});

exports.getBannerByIdController = asyncHandler(async (req, res) => {
  const banner = await getBannerById(req.params.id);
  if (!banner) throw new AppError("Banner not found", 404);
  return res.status(200).json({ status: true, banner });
});

exports.createBannerController = asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  const description = String(req.body.description || "").trim();
  const status = String(req.body.status || "active").trim().toLowerCase();

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const image =
    uploadedKey ?? parseMediaKeyFromBody(req.body.image, "image");

  if (!title) throw new AppError("title is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!image) throw new AppError("image is required", 400);
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }

  const banner = await createBanner({ title, description, image, status });
  return res.status(201).json({ status: true, message: "Banner created successfully", banner });
});

exports.updateBannerController = asyncHandler(async (req, res) => {
  const current = await getBannerRecordById(req.params.id);
  if (!current) throw new AppError("Banner not found", 404);

  const updates = {};
  if (req.body.title !== undefined) {
    const title = String(req.body.title || "").trim();
    if (!title) throw new AppError("title cannot be empty", 400);
    updates.title = title;
  }
  if (req.body.description !== undefined) {
    const description = String(req.body.description || "").trim();
    if (!description) throw new AppError("description cannot be empty", 400);
    updates.description = description;
  }
  if (req.body.status !== undefined) {
    const status = String(req.body.status || "").trim().toLowerCase();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }
  if (req.body.image !== undefined) {
    const image = parseMediaKeyFromBody(req.body.image, "image");
    if (image === null && current.image) {
      await deleteStoredMedia(current.image);
    }
    updates.image = image ?? "";
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (current.image && current.image !== uploadedKey) {
      await deleteStoredMedia(current.image);
    }
    updates.image = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let banner;
  try {
    banner = await updateBanner(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Banner not found", 404);
    throw err;
  }
  return res.status(200).json({ status: true, message: "Banner updated successfully", banner });
});

exports.deleteBannerController = asyncHandler(async (req, res) => {
  const current = await getBannerRecordById(req.params.id);
  if (!current) throw new AppError("Banner not found", 404);
  if (current.image) await deleteStoredMedia(current.image);

  try {
    await deleteBanner(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Banner not found", 404);
    throw err;
  }

  return res.status(200).json({ status: true, message: "Banner deleted successfully" });
});
