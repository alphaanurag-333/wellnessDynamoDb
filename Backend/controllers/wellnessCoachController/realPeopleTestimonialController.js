const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");

const ADMIN_ONLY_MSG =
  "Real People testimonials are managed by admin only. Coach review is no longer available.";

exports.listCoachRealPeopleTestimonialsController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.listCoachPendingRealPeopleTestimonialsController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.getCoachRealPeopleTestimonialByIdController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.reviewCoachRealPeopleTestimonialController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.updateCoachRealPeopleTestimonialController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.deleteCoachRealPeopleTestimonialController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});
