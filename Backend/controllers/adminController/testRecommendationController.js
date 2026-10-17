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
  deleteUserLabReport,
  reviewUserLabReport,
  saveUserLabReportAiAnalysis,
  updateUserLabReportAiAnalysis,
} = require("../../models/userLabReportModel");
const { analyzeLabReportFile } = require("../../services/labReportAiService");
const { labReportSubmissionState } = require("../../utils/labReportSubmission");
const { updateUser } = require("../../models/userModel");
const { normalizeAiAnalysis, panelsToAnalysis } = require("../../utils/labReportAi");
const {
  listActiveTestCatalog,
  getTestCatalogRecordById,
  updateTestCatalog,
  projectGoalCatalog,
} = require("../../models/testCatalogModel");
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

  const tests = await buildTestSnapshots(req.body);
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
  const hasReports = reports.length > 0;
  let lockedUser = user;
  if (
    hasReports
    && user.labReportSubmissionLocked !== true
    && user.labReportSubmissionLocked !== false
  ) {
    try {
      lockedUser = await updateUser(userId, { labReportSubmissionLocked: true });
    } catch (err) {
      console.error("Failed to persist lab report submission lock:", err?.message || err);
      lockedUser = { ...user, labReportSubmissionLocked: true };
    }
  }

  return res.status(200).json({
    status: true,
    message: "User lab reports fetched successfully",
    reports,
    ...labReportSubmissionState(lockedUser, { hasReports }),
  });
});

exports.deleteCoachUserLabReportController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reportId = String(req.params.reportId || "").trim();
  if (!reportId) throw new AppError("reportId is required", 400);

  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadLabReportForUser(reportId, userId);

  try {
    await deleteUserLabReport(reportId);
  } catch (err) {
    if (err?.name === "NotFoundError") {
      throw new AppError("Lab report not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Lab report deleted successfully",
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

function parseEnabledFlag(body) {
  const raw = body?.enabled !== undefined ? body.enabled : body?.submissionEnabled;
  if (raw === true || raw === false) return raw;
  const next = String(raw ?? "").trim().toLowerCase();
  if (next === "true") return true;
  if (next === "false") return false;
  return null;
}

exports.updateCoachUserLabReportSubmissionController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const enabled = parseEnabledFlag(req.body);
  if (enabled == null) {
    throw new AppError("enabled must be true or false", 400);
  }

  const updated = await updateUser(userId, { labReportSubmissionLocked: !enabled });

  return res.status(200).json({
    status: true,
    message: enabled
      ? "Client can submit a new report in the app"
      : "Client report upload disabled in the app",
    ...labReportSubmissionState(updated),
    submissionEnabled: enabled,
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

function sameCategoryName(a, b) {
  return String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
}

exports.appendCoachUserGoalTestsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const goalId = String(req.params.goalId || "").trim();
  const current = await getTestCatalogRecordById(goalId);
  if (!current || current.kind !== "goal") {
    throw new AppError("Goal not found", 404);
  }

  const incoming = Array.isArray(req.body?.tests) ? req.body.tests : [];
  const additions = incoming
    .map((test) => ({
      name: String(test?.name || "").trim(),
      code: String(test?.code || "FBS").trim().toUpperCase() || "FBS",
      hours: Math.max(0, Math.min(168, Math.round(Number(test?.hours) || 0))),
      category: String(test?.category || "Other").trim() || "Other",
      selected: test?.selected !== false,
      id: String(test?.id || "").trim(),
    }))
    .filter((test) => test.name.length >= 2);

  if (!additions.length) {
    throw new AppError("Add at least one named test to save on this goal", 400);
  }

  const sections = (Array.isArray(current.sections) ? current.sections : []).map((section, sectionIndex) => ({
    id: section?.id || `section-${sectionIndex + 1}`,
    category: String(section?.category || "").trim(),
    tests: (Array.isArray(section?.tests) ? section.tests : []).map((test, testIndex) => ({
      id: test?.id || `test-${sectionIndex + 1}-${testIndex + 1}`,
      name: String(test?.name || "").trim(),
      code: String(test?.code || "").trim(),
      hours: Number.isFinite(Number(test?.hours)) ? Number(test.hours) : 0,
      selected: test?.selected !== false,
    })),
  })).filter((section) => section.category);

  additions.forEach((test) => {
    let section = sections.find((entry) => sameCategoryName(entry.category, test.category));
    if (!section) {
      section = {
        id: `section-${sections.length + 1}`,
        category: test.category,
        tests: [],
      };
      sections.push(section);
    }
    const existing = section.tests.find(
      (row) => String(row.name || "").trim().toLowerCase() === test.name.toLowerCase(),
    );
    const row = {
      id: existing?.id || (test.id.startsWith("custom::") ? undefined : test.id) || undefined,
      name: test.name,
      code: test.code,
      hours: test.hours,
      selected: test.selected,
    };
    if (existing) Object.assign(existing, row);
    else section.tests.push(row);
  });

  let projected;
  try {
    projected = projectGoalCatalog({
      name: current.name,
      status: current.status,
      sections,
      dismissedCategories: current.dismissedCategories,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  let saved;
  try {
    saved = await updateTestCatalog(goalId, projected);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") throw new AppError("Goal not found", 404);
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Tests saved to goal",
    test: saved,
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
