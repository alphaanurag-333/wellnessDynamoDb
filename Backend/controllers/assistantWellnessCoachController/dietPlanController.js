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
  assertAssistantCanAccessUser,
  loadDietPlanForUser,
  uploadDietPlanPdf,
  resolveCoachIdForUser,
} = require("../dietPlanControllerHelpers");

exports.listAssistantUserDietPlansController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
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

exports.createAssistantUserDietPlanController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
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
      createdByRole: "assistant_wellness_coach",
      createdById: assistantId,
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

exports.deleteAssistantUserDietPlanController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const planId = readPlanIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
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
