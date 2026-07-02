const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listAssignedMentalWellbeingByUserId,
} = require("../../models/assignedMentalWellbeingModel");

exports.getUserAssignedMentalWellbeingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const assignments = await listAssignedMentalWellbeingByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Assigned mental wellbeing content fetched successfully",
    assignments,
  });
});
