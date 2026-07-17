const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadMulterField,
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
const BANNER_TYPE_VALUES = new Set(["main", "wellnesspedia"]);

function parseBannerType(raw, { required = false } = {}) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) {
    if (required) return null;
    return "";
  }
  if (!BANNER_TYPE_VALUES.has(value)) return null;
  return value;
}

exports.listBannersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, bannerType, type } = req.query;
  const parsedType = parseBannerType(bannerType || type);
  if ((bannerType || type) && parsedType === null) {
    throw new AppError("bannerType must be main or wellnesspedia", 400);
  }
  const data = await listBanners({
    page,
    limit,
    status,
    search,
    ...(parsedType ? { bannerType: parsedType } : {}),
  });
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
  const bannerType = parseBannerType(req.body.bannerType || req.body.type || "main", { required: true });

  const uploadedImage = await uploadMulterField(req, "file", S3_FOLDER);
  const uploadedMobileImage = await uploadMulterField(req, "mobileImage", S3_FOLDER);
  const image = uploadedImage ?? parseMediaKeyFromBody(req.body.image, "image");
  const mobileImage =
    uploadedMobileImage ?? parseMediaKeyFromBody(req.body.mobileImage, "mobileImage");

  if (!title) throw new AppError("title is required", 400);
  if (!description) throw new AppError("description is required", 400);
  if (!mobileImage) throw new AppError("mobileImage is required", 400);
  if (bannerType !== "wellnesspedia" && !image) {
    throw new AppError("image is required", 400);
  }
  if (!["active", "inactive"].includes(status)) {
    throw new AppError("status must be active or inactive", 400);
  }
  if (!bannerType) {
    throw new AppError("bannerType must be main or wellnesspedia", 400);
  }

  const resolvedImage = image || mobileImage;

  const banner = await createBanner({
    title,
    description,
    image: resolvedImage,
    mobileImage,
    status,
    bannerType,
  });
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
  if (req.body.bannerType !== undefined || req.body.type !== undefined) {
    const bannerType = parseBannerType(req.body.bannerType ?? req.body.type, { required: true });
    if (!bannerType) {
      throw new AppError("bannerType must be main or wellnesspedia", 400);
    }
    updates.bannerType = bannerType;
  }
  if (req.body.image !== undefined) {
    const image = parseMediaKeyFromBody(req.body.image, "image");
    if (image === null && current.image) {
      await deleteStoredMedia(current.image);
    }
    updates.image = image ?? "";
  }
  if (req.body.mobileImage !== undefined) {
    const mobileImage = parseMediaKeyFromBody(req.body.mobileImage, "mobileImage");
    if (mobileImage === null && current.mobileImage) {
      await deleteStoredMedia(current.mobileImage);
    }
    updates.mobileImage = mobileImage ?? "";
  }

  const uploadedImage = await uploadMulterField(req, "file", S3_FOLDER);
  if (uploadedImage) {
    if (current.image && current.image !== uploadedImage) {
      await deleteStoredMedia(current.image);
    }
    updates.image = uploadedImage;
  }

  const uploadedMobileImage = await uploadMulterField(req, "mobileImage", S3_FOLDER);
  if (uploadedMobileImage) {
    if (current.mobileImage && current.mobileImage !== uploadedMobileImage) {
      await deleteStoredMedia(current.mobileImage);
    }
    updates.mobileImage = uploadedMobileImage;
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
  if (current.mobileImage) await deleteStoredMedia(current.mobileImage);

  try {
    await deleteBanner(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Banner not found", 404);
    throw err;
  }

  return res.status(200).json({ status: true, message: "Banner deleted successfully" });
});
