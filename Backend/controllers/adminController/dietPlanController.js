const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listDietPlansByUserId,
  deleteDietPlan,
  getDietPlanRecordById,
} = require("../../models/dietPlanModel");
const {
  readUserIdParam,
  readPlanIdParam,
  loadTargetUser,
} = require("../dietPlanControllerHelpers");

exports.adminListUserDietPlansController = asyncHandler(async (req, res) => {
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);

  const dietPlans = await listDietPlansByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Diet plans fetched successfully",
    user: { id: user.id, _id: user.id, name: user.name, email: user.email, userTier: user.userTier },
    dietPlans,
    recommended: dietPlans[0] || null,
    history: dietPlans.length > 1 ? dietPlans.slice(1) : [],
  });
});

exports.adminDeleteDietPlanController = asyncHandler(async (req, res) => {
  const planId = readPlanIdParam(req);
  const record = await getDietPlanRecordById(planId);
  if (!record) throw new AppError("Diet plan not found", 404);

  try {
    await deleteDietPlan(planId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Diet plan not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan deleted successfully",
  });
});
