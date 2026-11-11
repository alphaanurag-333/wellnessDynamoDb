const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getCoachAssignedDietPlanRecordById,
  listUserAppDietPlanSplit,
  toCoachAssignedDietPlanPublic,
} = require("../../models/coachAssignedDietPlanModel");
const { getUserById, isDietPlanEnabled } = require("../../models/userModel");
const {
  enrichDietPlanAssignmentForUserApp,
  buildUserDietPlansListPayload,
} = require("../../utils/dietPlanUserAppView");

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

  const { recommended, history } = await listUserAppDietPlanSplit(userId);
  const payload = buildUserDietPlansListPayload(recommended, history);

  return res.status(200).json({
    status: true,
    message: "Assigned diet plans fetched successfully",
    ...payload,
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
  const record = await getCoachAssignedDietPlanRecordById(assignmentId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Diet plan assignment not found", 404);
  }

  const assignment = toCoachAssignedDietPlanPublic(record, {
    audience: "user",
    includeArchivedHistory: true,
  });
  if (!assignment) {
    throw new AppError("Diet plan assignment not found", 404);
  }

  const enriched = enrichDietPlanAssignmentForUserApp(assignment);

  return res.status(200).json({
    status: true,
    message: "Diet plan assignment fetched successfully",
    assignment: enriched,
    recommended: enriched,
    personalisedSections: enriched?.personalisedSections || [],
  });
});
