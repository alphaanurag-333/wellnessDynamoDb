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

exports.listAssistantRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const { page = 1, limit = 20, status, approvalStatus, search } = req.query;
  const data = await listRealPeopleTestimonials({
    page,
    limit,
    status,
    approvalStatus,
    search,
    managedByCoachId: parentCoachId,
  });

  const filtered = data.realPeopleTestimonials.filter(
    (row) =>
      String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(row.assignedCoachId || "") === String(assistantId)
  );

  return res.status(200).json({
    status: true,
    realPeopleTestimonials: filtered,
    pagination: data.pagination,
  });
});

exports.listAssistantPendingRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const data = await listRealPeopleTestimonials({
    page: 1,
    limit: 100,
    approvalStatus: "pending",
    managedByCoachId: parentCoachId,
  });

  const filtered = data.realPeopleTestimonials.filter(
    (row) =>
      String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(row.assignedCoachId || "") === String(assistantId)
  );

  return res.status(200).json({
    status: true,
    realPeopleTestimonials: filtered,
    total: filtered.length,
  });
});

exports.getAssistantRealPeopleTestimonialByIdController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const record = await getRealPeopleTestimonialRecordById(readIdParam(req));
  if (!record) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(record, { assistantId });

  const testimonial = await getRealPeopleTestimonialById(record.id);
  return res.status(200).json({ status: true, realPeopleTestimonial: testimonial });
});

exports.reviewAssistantRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const record = await getRealPeopleTestimonialRecordById(id);
  if (!record) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(record, { assistantId });

  if (String(record.approvalStatus || "") !== "pending") {
    throw new AppError("Testimonial is not pending approval", 400);
  }

  const action = String(req.body.action || req.body.approvalStatus || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(action)) {
    throw new AppError("action must be approved or rejected", 400);
  }

  const testimonial = await reviewRealPeopleTestimonial(id, {
    approvalStatus: action,
    reviewedByRole: "assistant_wellness_coach",
    reviewedById: assistantId,
    rejectionReason: req.body.rejectionReason,
  });

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Testimonial approved" : "Testimonial rejected",
    realPeopleTestimonial: testimonial,
  });
});

exports.updateAssistantRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(current, { assistantId });

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

exports.deleteAssistantRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current) throw new AppError("Testimonial not found", 404);
  assertCoachCanManageTestimonial(current, { assistantId });

  await deleteRealPeopleTestimonial(id);
  return res.status(200).json({
    status: true,
    message: "Testimonial deleted successfully",
  });
});
