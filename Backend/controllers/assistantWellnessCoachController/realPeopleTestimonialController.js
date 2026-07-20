const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");

const ADMIN_ONLY_MSG =
  "Real People testimonials are managed by admin only. Assistant review is no longer available.";

exports.listAssistantRealPeopleTestimonialsController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.listAssistantPendingRealPeopleTestimonialsController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.getAssistantRealPeopleTestimonialByIdController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.reviewAssistantRealPeopleTestimonialController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.updateAssistantRealPeopleTestimonialController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});

exports.deleteAssistantRealPeopleTestimonialController = asyncHandler(async () => {
  throw new AppError(ADMIN_ONLY_MSG, 410);
});
