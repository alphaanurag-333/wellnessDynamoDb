const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachRecommendedTest,
  listCoachRecommendedTestsByUserId,
  deleteCoachRecommendedTest,
} = require("../../models/coachRecommendedTestModel");
const { listUserLabReportsByUserId } = require("../../models/userLabReportModel");
const {
  dispatchInternalParametersRecommendationNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readRecommendationIdParam,
  parseReportDate,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
  buildTestSnapshots,
  generateAndUploadRecommendationPdf,
} = require("../testRecommendationControllerHelpers");

exports.listCoachUserTestRecommendationsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const recommendations = await listCoachRecommendedTestsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Test recommendations fetched successfully",
    recommendations,
    recommended: recommendations[0] || null,
    history: recommendations.length > 1 ? recommendations.slice(1) : [],
  });
});

exports.createCoachUserTestRecommendationController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const reportDate = parseReportDate(req.body);
  if (!reportDate) throw new AppError("reportDate is required", 400);

  const tests = await buildTestSnapshots(req.body.testIds);
  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };

  const pdfKey = await generateAndUploadRecommendationPdf({
    user,
    coach,
    reportDate,
    tests,
  });

  let recommendation;
  try {
    recommendation = await createCoachRecommendedTest({
      userId,
      coachId: resolveCoachIdForUser(user),
      reportDate,
      tests,
      pdfKey,
      createdByRole: req.auth?.role || "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coachName = coach?.name || "Your coach";
  dispatchInternalParametersRecommendationNotification({
    userId,
    recommendationId: recommendation?.id,
    coachName,
  }).catch((err) => {
    console.error("Internal parameters recommendation notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Test recommendation created successfully",
    recommendation,
  });
});

exports.listCoachUserLabReportsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const reports = await listUserLabReportsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "User lab reports fetched successfully",
    reports,
  });
});

exports.deleteCoachUserTestRecommendationController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadRecommendationForUser(recommendationId, userId);

  try {
    await deleteCoachRecommendedTest(recommendationId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Test recommendation not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Test recommendation deleted successfully",
  });
});
