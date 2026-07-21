const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  createCoachRecommendedSupplement,
  listCoachRecommendedSupplementsByUserId,
  deleteCoachRecommendedSupplement,
} = require("../../../models/coachRecommendedSupplementModel");
const { getAdminById } = require("../../../models/adminModel");
const { getWellnessCoachById } = require("../../../models/wellnessCoachModel");
const {
  dispatchSupplementRecommendedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readRecommendationIdParam,
  parseRecommendationItems,
  parseDeliveryOption,
  buildRecommendationItemSnapshots,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
} = require("../../supplementControllerHelpers");

exports.listAdminUserSupplementRecommendationsController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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

exports.createAdminUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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
      createdByRole: "admin",
      createdById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const admin = await getAdminById(adminId);
  const coach = admin?.wellnessCoachId
    ? await getWellnessCoachById(admin.wellnessCoachId)
    : null;
  dispatchSupplementRecommendedNotification({
    userId,
    coachName: admin?.name || coach?.name || "Your coach",
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

exports.deleteAdminUserSupplementRecommendationController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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
