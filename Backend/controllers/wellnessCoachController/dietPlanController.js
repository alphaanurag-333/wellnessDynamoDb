const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { createDietPlan, listDietPlansByUserId, deleteDietPlan } = require("../../models/dietPlanModel");
const {
  readUserIdParam,
  readPlanIdParam,
  parseDietPlanBody,
  handleValidationError,
  loadTargetUser,
  assertHealTierUser,
  assertCoachCanAccessUser,
  loadDietPlanForUser,
  uploadDietPlanPdf,
  resolveCoachIdForUser,
} = require("../dietPlanControllerHelpers");

exports.listCoachUserDietPlansController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);

  const dietPlans = await listDietPlansByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Diet plans fetched successfully",
    dietPlans,
    recommended: dietPlans[0] || null,
    history: dietPlans.length > 1 ? dietPlans.slice(1) : [],
  });
});

exports.createCoachUserDietPlanController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);

  const fileKey = await uploadDietPlanPdf(req);
  const payload = parseDietPlanBody(req.body);

  let dietPlan;
  try {
    dietPlan = await createDietPlan({
      userId,
      coachId: resolveCoachIdForUser(user),
      ...payload,
      fileKey,
      createdByRole: "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Diet plan uploaded successfully",
    dietPlan,
  });
});

exports.deleteCoachUserDietPlanController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const planId = readPlanIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);
  await loadDietPlanForUser(planId, userId);

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
