const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listCoachAssignedDietPlansByUserId,
} = require("../../models/coachAssignedDietPlanModel");
const { getUserById, isDietPlanEnabled } = require("../../models/userModel");

exports.getUserAssignedDietPlansController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);

  if (!isDietPlanEnabled(user)) {
    return res.status(200).json({
      status: true,
      message: "Assigned diet plans fetched successfully",
      recommended: null,
      history: [],
      assignments: [],
      dietPlanEnabled: false,
    });
  }

  const assignments = await listCoachAssignedDietPlansByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Assigned diet plans fetched successfully",
    recommended: assignments[0] || null,
    history: assignments.length > 1 ? assignments.slice(1) : [],
    assignments,
    dietPlanEnabled: true,
  });
});

exports.getUserAssignedDietPlanByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (!isDietPlanEnabled(user)) {
    throw new AppError("Diet plan is not enabled for your account", 403);
  }

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
