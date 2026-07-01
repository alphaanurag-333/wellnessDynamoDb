const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listAssignedPhysicalExercisesByUserId,
} = require("../../models/assignedPhysicalExerciseModel");

exports.getUserAssignedExercisesController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const assignments = await listAssignedPhysicalExercisesByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Assigned physical exercises fetched successfully",
    assignments,
    exercises: assignments.map((row) => row.exercise).filter(Boolean),
  });
});
