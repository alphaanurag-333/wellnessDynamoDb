const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachRecommendedSupplement,
  listCoachRecommendedSupplementsByUserId,
  deleteCoachRecommendedSupplement,
} = require("../../models/coachRecommendedSupplementModel");
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
  assertCoachCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
} = require("../supplementControllerHelpers");

exports.listCoachUserSupplementRecommendationsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
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

exports.createCoachUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
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
      createdByRole: req.auth?.role || "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
  dispatchSupplementRecommendedNotification({
    userId,
    coachName: coach?.name || "Your coach",
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

exports.deleteCoachUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
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
