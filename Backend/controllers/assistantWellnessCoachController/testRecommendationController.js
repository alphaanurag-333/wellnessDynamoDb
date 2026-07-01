const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachRecommendedTest,
  listCoachRecommendedTestsByUserId,
  deleteCoachRecommendedTest,
} = require("../../models/coachRecommendedTestModel");
const { listUserLabReportsByUserId } = require("../../models/userLabReportModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  dispatchInternalParametersRecommendationNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readRecommendationIdParam,
  parseReportDate,
  loadTargetUser,
  assertAssistantCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
  buildTestSnapshots,
  generateAndUploadRecommendationPdf,
} = require("../testRecommendationControllerHelpers");

exports.listAssistantUserTestRecommendationsController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
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

exports.createAssistantUserTestRecommendationController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const reportDate = parseReportDate(req.body);
  if (!reportDate) throw new AppError("reportDate is required", 400);

  const tests = await buildTestSnapshots(req.body.testIds);
  const assistant = await getAssistantWellnessCoachById(actingAssistantId);
  const coach = assistant?.wellnessCoachId
    ? await getWellnessCoachById(assistant.wellnessCoachId)
    : null;

  const pdfKey = await generateAndUploadRecommendationPdf({
    user,
    coach: coach || assistant,
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
      createdByRole: "assistant_wellness_coach",
      createdById: actingAssistantId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coachName = assistant?.name || coach?.name || "Your coach";
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

exports.listAssistantUserLabReportsController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const reports = await listUserLabReportsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "User lab reports fetched successfully",
    reports,
  });
});

exports.deleteAssistantUserTestRecommendationController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
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
