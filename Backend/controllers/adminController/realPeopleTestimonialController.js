const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  readProfileImageKey,
  parseProfileImageFromBody,
} = require("../../utils/mediaFieldAliases");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const {
  createRealPeopleTestimonial,
  getRealPeopleTestimonialById,
  getRealPeopleTestimonialRecordById,
  updateRealPeopleTestimonial,
  deleteRealPeopleTestimonial,
  listRealPeopleTestimonials,
} = require("../../models/realPeopleTestimonialModel");
const {
  readIdParam,
  validateReview,
  validateStars,
  validateStatus,
  validateName,
  validateHealthConcernId,
} = require("../realPeopleTestimonialControllerHelpers");

const S3_FOLDER = "real-people-testimonials";

async function assertHealthConcernExists(healthConcernId) {
  const id = validateHealthConcernId(healthConcernId);
  const concern = await getHealthConcernById(id);
  if (!concern) throw new AppError("Health concern not found", 400);
  return id;
}

exports.listRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, search, healthConcernId } = req.query;
  const data = await listRealPeopleTestimonials({
    page,
    limit,
    status,
    search,
    healthConcernId: String(healthConcernId || "").trim() || undefined,
  });
  return res.status(200).json({
    status: true,
    realPeopleTestimonials: data.realPeopleTestimonials,
    pagination: data.pagination,
  });
});

exports.getRealPeopleTestimonialByIdController = asyncHandler(async (req, res) => {
  const testimonial = await getRealPeopleTestimonialById(readIdParam(req));
  if (!testimonial) throw new AppError("Testimonial not found", 404);
  return res.status(200).json({ status: true, realPeopleTestimonial: testimonial });
});

exports.createRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const name = validateName(req.body.name);
  const review = validateReview(req.body.review ?? req.body.content);
  const stars = validateStars(req.body.stars ?? req.body.rating);
  const status = validateStatus(req.body.status || "active");
  const healthConcernId = await assertHealthConcernExists(req.body.healthConcernId);

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const profileImageRaw = parseProfileImageFromBody(req.body);
  const profileImage =
    uploadedKey ??
    (profileImageRaw !== undefined
      ? parseMediaKeyFromBody(profileImageRaw, "profileImage")
      : undefined);

  if (!profileImage) throw new AppError("profileImage is required", 400);

  const testimonial = await createRealPeopleTestimonial({
    name,
    review,
    stars,
    healthConcernId,
    profileImage,
    status,
  });

  return res.status(201).json({
    status: true,
    message: "Real people testimonial created successfully",
    realPeopleTestimonial: testimonial,
  });
});

exports.updateRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);

  const updates = {};
  const currentProfileImage = readProfileImageKey(current);

  if (req.body.name !== undefined) updates.name = validateName(req.body.name);
  if (req.body.review !== undefined || req.body.content !== undefined) {
    updates.review = validateReview(req.body.review ?? req.body.content);
  }
  if (req.body.stars !== undefined || req.body.rating !== undefined) {
    updates.stars = validateStars(req.body.stars ?? req.body.rating);
  }
  if (req.body.status !== undefined) updates.status = validateStatus(req.body.status);
  if (req.body.healthConcernId !== undefined) {
    updates.healthConcernId = await assertHealthConcernExists(req.body.healthConcernId);
  }

  const profileImageRaw = parseProfileImageFromBody(req.body);
  if (profileImageRaw !== undefined) {
    const profileImage = parseMediaKeyFromBody(profileImageRaw, "profileImage");
    if (profileImage === null && currentProfileImage) {
      await deleteStoredMedia(currentProfileImage);
    }
    if (profileImage === null) {
      throw new AppError("profileImage cannot be empty", 400);
    }
    updates.profileImage = profileImage;
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (currentProfileImage && currentProfileImage !== uploadedKey) {
      await deleteStoredMedia(currentProfileImage);
    }
    updates.profileImage = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let testimonial;
  try {
    testimonial = await updateRealPeopleTestimonial(id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Testimonial not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Real people testimonial updated successfully",
    realPeopleTestimonial: testimonial,
  });
});

exports.deleteRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);

  const profileImage = readProfileImageKey(current);
  if (profileImage) await deleteStoredMedia(profileImage);

  try {
    await deleteRealPeopleTestimonial(id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Testimonial not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Real people testimonial deleted successfully",
  });
});
