const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
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
  validateStatus,
  assertCoachCanManageTestimonial,
} = require("../realPeopleTestimonialControllerHelpers");

exports.listCoachRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, status, approvalStatus, search, healthConcernId } = req.query;
  const data = await listRealPeopleTestimonials({
    page,
    limit,
    status,
    approvalStatus,
    search,
    healthConcernId: String(healthConcernId || "").trim() || undefined,
    managedByCoachId: coachId,
  });

  return res.status(200).json({
    status: true,
    realPeopleTestimonials: data.realPeopleTestimonials,
    pagination: data.pagination,
  });
});

exports.listCoachPendingRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const data = await listRealPeopleTestimonials({
    page: 1,
    limit: 100,
    approvalStatus: "pending",
    managedByCoachId: coachId,
  });

  return res.status(200).json({
    status: true,
    realPeopleTestimonials: data.realPeopleTestimonials,
    total: data.realPeopleTestimonials.length,
  });
});

exports.getCoachRealPeopleTestimonialByIdController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const record = await getRealPeopleTestimonialRecordById(readIdParam(req));
  if (!record) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(record, { coachId });

  const testimonial = await getRealPeopleTestimonialById(record.id);
  return res.status(200).json({ status: true, realPeopleTestimonial: testimonial });
});

exports.reviewCoachRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const record = await getRealPeopleTestimonialRecordById(id);
  if (!record) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(record, { coachId });

  if (String(record.approvalStatus || "") !== "pending") {
    throw new AppError("Testimonial is not pending approval", 400);
  }

  const action = String(req.body.action || req.body.approvalStatus || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(action)) {
    throw new AppError("action must be approved or rejected", 400);
  }

  const testimonial = await reviewRealPeopleTestimonial(id, {
    approvalStatus: action,
    reviewedByRole: "wellness_coach",
    reviewedById: coachId,
    rejectionReason: req.body.rejectionReason,
  });

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Testimonial approved" : "Testimonial rejected",
    realPeopleTestimonial: testimonial,
  });
});

exports.updateCoachRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(current, { coachId });

  const updates = {};
  if (req.body.review !== undefined || req.body.content !== undefined) {
    updates.review = validateReview(req.body.review ?? req.body.content);
  }
  if (req.body.stars !== undefined || req.body.rating !== undefined) {
    updates.stars = validateStars(req.body.stars ?? req.body.rating);
  }
  if (req.body.status !== undefined) updates.status = validateStatus(req.body.status);

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  const testimonial = await updateRealPeopleTestimonial(id, updates);
  return res.status(200).json({
    status: true,
    message: "Testimonial updated successfully",
    realPeopleTestimonial: testimonial,
  });
});

exports.deleteCoachRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(current, { coachId });

  await deleteRealPeopleTestimonial(id);
  return res.status(200).json({
    status: true,
    message: "Testimonial deleted successfully",
  });
});
