const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listCoachAssignedDietPlansByUserId,
} = require("../../models/coachAssignedDietPlanModel");

exports.getUserAssignedDietPlansController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const assignments = await listCoachAssignedDietPlansByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Assigned diet plans fetched successfully",
    recommended: assignments[0] || null,
    history: assignments.length > 1 ? assignments.slice(1) : [],
    assignments,
  });
});

exports.getUserAssignedDietPlanByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const assignmentId = String(req.params.id || "").trim();
  const assignments = await listCoachAssignedDietPlansByUserId(userId);
  const assignment = assignments.find((row) => String(row.id || row._id) === assignmentId);

  if (!assignment) {
    throw new AppError("Diet plan assignment not found", 404);
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan assignment fetched successfully",
    assignment,
  });
});
