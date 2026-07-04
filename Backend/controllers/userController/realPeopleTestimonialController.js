const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  createRealPeopleTestimonial,
  getRealPeopleTestimonialById,
  getRealPeopleTestimonialRecordById,
  updateRealPeopleTestimonial,
  deleteRealPeopleTestimonial,
  listRealPeopleTestimonials,
} = require("../../models/realPeopleTestimonialModel");
const { resolveAssignedCoachForUser } = require("../mealTrackingControllerHelpers");
const { resolveListMedia } = require("./userMiscMedia");
const {
  readIdParam,
  validateReview,
  validateStars,
  readTestimonialUserId,
} = require("../realPeopleTestimonialControllerHelpers");

exports.listUserRealPeopleTestimonialsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, healthConcernId } = req.query;
  const normalizedHealthConcernId = String(healthConcernId || "").trim() || undefined;
  const data = resolveListMedia(
    await listRealPeopleTestimonials({
      page,
      limit,
      status: "active",
      publicOnly: true,
      healthConcernId: normalizedHealthConcernId,
    }),
    "realPeopleTestimonials",
    ["userAvatar"]
  );

  return res.status(200).json({
    status: true,
    realPeopleTestimonials: data.realPeopleTestimonials,
    pagination: data.pagination,
  });
});

exports.getUserRealPeopleTestimonialByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const testimonial = await getRealPeopleTestimonialById(readIdParam(req));
  if (!testimonial) throw new AppError("Testimonial not found", 404);

  const isOwner = readTestimonialUserId(testimonial) === String(userId);
  const isPublic =
    String(testimonial.status || "").toLowerCase() === "active" &&
    String(testimonial.approvalStatus || "").toLowerCase() === "approved";

  if (!isOwner && !isPublic) {
    throw new AppError("Testimonial not found", 404);
  }

  return res.status(200).json({ status: true, realPeopleTestimonial: testimonial });
});

exports.createUserRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = req.user || (await getUserById(userId));
  if (!user) throw new AppError("User not found", 404);

  const review = validateReview(req.body.review ?? req.body.content);
  const stars = validateStars(req.body.stars ?? req.body.rating);
  const coachAssignment = resolveAssignedCoachForUser(user);

  const testimonial = await createRealPeopleTestimonial({
    userId,
    review,
    stars,
    status: "inactive",
    approvalStatus: "pending",
    submittedByRole: "user",
    managedByCoachId: coachAssignment.coachId || null,
    assignedCoachType: coachAssignment.assignedCoachType || null,
    assignedCoachId: coachAssignment.assignedCoachId || null,
  });

  return res.status(201).json({
    status: true,
    message: "Testimonial submitted for approval",
    realPeopleTestimonial: testimonial,
  });
});

exports.updateUserRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current || readTestimonialUserId(current) !== String(userId)) {
    throw new AppError("Testimonial not found", 404);
  }
  if (String(current.approvalStatus || "") !== "pending") {
    throw new AppError("Only pending testimonials can be edited", 400);
  }

  const updates = {
    approvalStatus: "pending",
    status: "inactive",
  };
  if (req.body.review !== undefined || req.body.content !== undefined) {
    updates.review = validateReview(req.body.review ?? req.body.content);
  }
  if (req.body.stars !== undefined || req.body.rating !== undefined) {
    updates.stars = validateStars(req.body.stars ?? req.body.rating);
  }

  const testimonial = await updateRealPeopleTestimonial(id, updates);
  return res.status(200).json({
    status: true,
    message: "Testimonial updated and resubmitted for approval",
    realPeopleTestimonial: testimonial,
  });
});

exports.deleteUserRealPeopleTestimonialController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const current = await getRealPeopleTestimonialRecordById(id);
  if (!current || readTestimonialUserId(current) !== String(userId)) {
    throw new AppError("Testimonial not found", 404);
  }
  if (String(current.approvalStatus || "") === "approved") {
    throw new AppError("Approved testimonials cannot be deleted by user", 400);
  }

  await deleteRealPeopleTestimonial(id);
  return res.status(200).json({
    status: true,
    message: "Testimonial deleted successfully",
  });
});
