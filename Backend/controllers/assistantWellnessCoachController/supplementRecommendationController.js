const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachRecommendedSupplement,
  listCoachRecommendedSupplementsByUserId,
  deleteCoachRecommendedSupplement,
} = require("../../models/coachRecommendedSupplementModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  dispatchSupplementRecommendedNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readRecommendationIdParam,
  parseRecommendationItems,
  parseDeliveryOption,
  buildRecommendationItemSnapshots,
  loadTargetUser,
  assertAssistantCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
} = require("../supplementControllerHelpers");

exports.listAssistantUserSupplementRecommendationsController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const recommendations = await listCoachRecommendedSupplementsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Supplement recommendations fetched successfully",
    recommendations,
    recommended: recommendations[0] || null,
    history: recommendations.length > 1 ? recommendations.slice(1) : [],
  });
});

exports.createAssistantUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const parsedItems = parseRecommendationItems(req.body);
  const deliveryOption = parseDeliveryOption(req.body);
  const items = await buildRecommendationItemSnapshots(parsedItems);

  let recommendation;
  try {
    recommendation = await createCoachRecommendedSupplement({
      userId,
      coachId: resolveCoachIdForUser(user),
      items,
      deliveryOption,
      createdByRole: "assistant_wellness_coach",
      createdById: actingAssistantId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const assistant = await getAssistantWellnessCoachById(actingAssistantId);
  const coach = assistant?.wellnessCoachId
    ? await getWellnessCoachById(assistant.wellnessCoachId)
    : null;
  dispatchSupplementRecommendedNotification({
    userId,
    coachName: assistant?.name || coach?.name || "Your coach",
    recommendationId: recommendation?.id,
  }).catch((err) => {
    console.error("Supplement recommendation notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Supplement recommendation created successfully",
    recommendation,
  });
});

exports.deleteAssistantUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);
  await loadRecommendationForUser(recommendationId, userId);

  try {
    await deleteCoachRecommendedSupplement(recommendationId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Supplement recommendation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Supplement recommendation removed successfully",
  });
});
