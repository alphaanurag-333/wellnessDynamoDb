const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachRecommendedTest,
  listCoachRecommendedTestsByUserId,
  deleteCoachRecommendedTest,
} = require("../../models/coachRecommendedTestModel");
const {
  listUserLabReportsByUserId,
  getUserLabReportRecordById,
  reviewUserLabReport,
  saveUserLabReportAiAnalysis,
  updateUserLabReportAiAnalysis,
} = require("../../models/userLabReportModel");
const { analyzeLabReportFile } = require("../../services/labReportAiService");
const { normalizeAiAnalysis, panelsToAnalysis } = require("../../utils/labReportAi");
const { listActiveTestCatalog } = require("../../models/testCatalogModel");
const {
  dispatchInternalParametersRecommendationNotification,
} = require("../../services/notificationDispatchService");
const { sendStoredObjectAsAttachment } = require("../../utils/s3");
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
} = require("../helpers/testRecommendationControllerHelpers");

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
  const notifyResult = await dispatchInternalParametersRecommendationNotification({
    userId,
    recommendationId: recommendation?.id,
    coachName,
  }).catch((err) => {
    console.error("Internal parameters recommendation notification failed:", err?.message || err);
    return null;
  });

  return res.status(201).json({
    status: true,
    message: "Test recommendation created successfully",
    recommendation,
    whatsapp: notifyResult?.whatsapp || null,
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

exports.reviewCoachUserLabReportController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reportId = String(req.params.reportId || "").trim();
  if (!reportId) throw new AppError("reportId is required", 400);

  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const record = await getUserLabReportRecordById(reportId);
  if (!record || String(record.userId) !== String(userId)) {
    throw new AppError("Lab report not found", 404);
  }

  const report = await reviewUserLabReport(reportId, { reviewedById: actingCoachId });
  return res.status(200).json({
    status: true,
    message: "Lab report marked as reviewed",
    report,
  });
});

async function loadLabReportForUser(reportId, userId) {
  const record = await getUserLabReportRecordById(reportId);
  if (!record || String(record.userId) !== String(userId)) {
    throw new AppError("Lab report not found", 404);
  }
  return record;
}

function analysisPanelsFromStored(analysis) {
  return (analysis?.panels || []).map((panel) => ({
    title: panel.title,
    rows: (panel.rows || []).map((row) => ({
      name: row.name,
      optimal: row.optimal,
      rr: row.rr,
      readings: [{ value: row.value, tone: row.tone, note: row.note }],
    })),
  }));
}

function readAiAnalysisFromBody(body, { reportDate, fallback } = {}) {
  if (body?.aiAnalysis && typeof body.aiAnalysis === "object") {
    return normalizeAiAnalysis(body.aiAnalysis, { reportDate });
  }
  if (Array.isArray(body?.panels)) {
    return panelsToAnalysis(body.panels, {
      dateLabel: body.dateLabel || fallback?.dateLabel,
      bloodSummary: body.bloodSummary,
      protocolItems: body.protocolItems,
      nutritionSummary: body.nutritionSummary,
    });
  }
  if (fallback) {
    return panelsToAnalysis(analysisPanelsFromStored(fallback), {
      dateLabel: fallback.dateLabel,
      bloodSummary: body?.bloodSummary ?? fallback.bloodSummary,
      protocolItems: body?.protocolItems ?? fallback.protocolItems,
      nutritionSummary: body?.nutritionSummary ?? fallback.nutritionSummary,
    });
  }
  throw new AppError("AI analysis payload is required", 400);
}

exports.analyzeCoachUserLabReportController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reportId = String(req.params.reportId || "").trim();
  if (!reportId) throw new AppError("reportId is required", 400);

  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const record = await loadLabReportForUser(reportId, userId);
  if (!record.fileKey) throw new AppError("This report has no file to analyse", 422);

  let analysis;
  try {
    analysis = await analyzeLabReportFile({
      fileKey: record.fileKey,
      reportDate: record.reportDate,
    });
  } catch (err) {
    await saveUserLabReportAiAnalysis(reportId, {
      aiStatus: "failed",
      aiError: err?.message || "AI analysis failed",
      analysedById: actingCoachId,
    }).catch(() => {});
    if (err instanceof AppError) throw err;
    throw new AppError(err?.message || "AI analysis failed", 502);
  }

  const report = await saveUserLabReportAiAnalysis(reportId, {
    aiStatus: "analysed",
    aiAnalysis: analysis,
    analysedById: actingCoachId,
  });

  return res.status(200).json({
    status: true,
    message: "Lab report analysed successfully",
    report,
  });
});

exports.updateCoachUserLabReportAiController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reportId = String(req.params.reportId || "").trim();
  if (!reportId) throw new AppError("reportId is required", 400);

  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const record = await loadLabReportForUser(reportId, userId);
  let analysis;
  try {
    analysis = readAiAnalysisFromBody(req.body, {
      reportDate: record.reportDate,
      fallback: record.aiAnalysis,
    });
  } catch (err) {
    if (err?.name === "AiParseError") throw new AppError(err.message, 400);
    handleValidationError(err);
  }

  let report;
  try {
    report = await updateUserLabReportAiAnalysis(reportId, analysis);
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError("Lab report not found", 404);
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "AI interpretation saved",
    report,
  });
});

exports.downloadCoachUserTestRecommendationPdfController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const recommendationId = readRecommendationIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const record = await loadRecommendationForUser(recommendationId, userId);
  if (!record?.pdfKey) {
    throw new AppError("PDF is not available for this recommendation", 404);
  }

  const datePart = String(record.reportDate || "list").slice(0, 10);
  await sendStoredObjectAsAttachment(res, record.pdfKey, {
    filename: `recommended-tests-${datePart}.pdf`,
    contentType: "application/pdf",
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

exports.listCoachUserActiveTestCatalogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);

  const tests = await listActiveTestCatalog();
  const grouped = tests.reduce((acc, test) => {
    const category = test.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(test);
    return acc;
  }, {});

  return res.status(200).json({
    status: true,
    message: "Test catalog fetched successfully",
    tests,
    grouped,
  });
});
