const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createRealPeopleTestimonial,
  getRealPeopleTestimonialById,
  getRealPeopleTestimonialRecordById,
  updateRealPeopleTestimonial,
  deleteRealPeopleTestimonial,
  listRealPeopleTestimonials,
  reviewRealPeopleTestimonial,
} = require("../../models/realPeopleTestimonialModel");
const {
  readIdParam,
  validateReview,
  validateStars,
  validateUserId,
  validateStatus,
  validateApprovalStatus,
} = require("../realPeopleTestimonialControllerHelpers");

exports.listRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, approvalStatus, search, healthConcernId } = req.query;
  const data = await listRealPeopleTestimonials({
    page,
    limit,
    status,
    approvalStatus,
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
  const userId = await validateUserId(req.body.userId);
  const review = validateReview(req.body.review ?? req.body.content);
  const stars = validateStars(req.body.stars ?? req.body.rating);
  const status = validateStatus(req.body.status || "active");
  const approvalStatus = validateApprovalStatus(req.body.approvalStatus || "approved");

  const testimonial = await createRealPeopleTestimonial({
    userId,
    review,
    stars,
    status,
    approvalStatus,
    submittedByRole: "admin",
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

  if (req.body.userId !== undefined) updates.userId = await validateUserId(req.body.userId);
  if (req.body.review !== undefined || req.body.content !== undefined) {
    updates.review = validateReview(req.body.review ?? req.body.content);
  }
  if (req.body.stars !== undefined || req.body.rating !== undefined) {
    updates.stars = validateStars(req.body.stars ?? req.body.rating);
  }
  if (req.body.status !== undefined) updates.status = validateStatus(req.body.status);
  if (req.body.approvalStatus !== undefined) {
    updates.approvalStatus = validateApprovalStatus(req.body.approvalStatus);
    if (updates.approvalStatus === "approved" && req.body.status === undefined) {
      updates.status = "active";
    }
    if (updates.approvalStatus === "rejected" && req.body.status === undefined) {
      updates.status = "inactive";
    }
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

exports.approveRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);

  const action = String(req.body.action || req.body.approvalStatus || "approved").trim().toLowerCase();
  if (!["approved", "rejected"].includes(action)) {
    throw new AppError("action must be approved or rejected", 400);
  }

  const testimonial = await reviewRealPeopleTestimonial(id, {
    approvalStatus: action,
    reviewedByRole: "admin",
    reviewedById: req.auth?.sub,
    rejectionReason: req.body.rejectionReason,
  });

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Testimonial approved" : "Testimonial rejected",
    realPeopleTestimonial: testimonial,
  });
});

exports.deleteRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);

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
