const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getRealPeopleTestimonialById,
  listRealPeopleTestimonials,
} = require("../../models/realPeopleTestimonialModel");
const { resolveListMedia } = require("./userMiscMedia");
const { readIdParam } = require("../realPeopleTestimonialControllerHelpers");

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
      healthConcernId: normalizedHealthConcernId,
    }),
    "realPeopleTestimonials",
    ["profileImage", "userAvatar"]
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
  if (!testimonial || String(testimonial.status || "").toLowerCase() !== "active") {
    throw new AppError("Testimonial not found", 404);
  }

  return res.status(200).json({ status: true, realPeopleTestimonial: testimonial });
});
