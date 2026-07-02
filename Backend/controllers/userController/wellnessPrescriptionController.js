const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listCoachAssignedWellnessPrescriptionsByUserId,
} = require("../../models/coachAssignedWellnessPrescriptionModel");

exports.getUserWellnessPrescriptionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const assignments = await listCoachAssignedWellnessPrescriptionsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Wellness prescriptions fetched successfully",
    recommended: assignments[0] || null,
    history: assignments.length > 1 ? assignments.slice(1) : [],
    assignments,
  });
});
