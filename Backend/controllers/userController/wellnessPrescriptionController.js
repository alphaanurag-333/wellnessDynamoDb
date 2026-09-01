const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  listEnrichedWellnessPrescriptionsForUser,
} = require("../../services/wellnessPrescriptionReviewService");

function mapPrescriptionListResponse(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  return {
    assignments: list,
    recommended: list[0] || null,
    history: list.length > 1 ? list.slice(1) : [],
  };
}

exports.getUserWellnessPrescriptionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  const assignments = await listEnrichedWellnessPrescriptionsForUser(userId, user);

  return res.status(200).json({
    status: true,
    message: "Wellness prescriptions fetched successfully",
    ...mapPrescriptionListResponse(assignments),
  });
});

exports.getUserReviewHistoryController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  const assignments = await listEnrichedWellnessPrescriptionsForUser(userId, user);

  return res.status(200).json({
    status: true,
    message: "Review history fetched successfully",
    reviews: assignments,
  });
});
