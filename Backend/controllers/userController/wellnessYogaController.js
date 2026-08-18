const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listAssignedWellnessYogaByUserId,
} = require("../../models/assignedWellnessYogaModel");

exports.getUserAssignedWellnessYogaController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const assignments = await listAssignedWellnessYogaByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Assigned yoga content fetched successfully",
    assignments,
  });
});
