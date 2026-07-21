const AppError = require("../utils/AppError");
const { uploadBufferToS3 } = require("../utils/s3");
const { generateTestRecommendationPdf } = require("../utils/testRecommendationPdf");
const { getAppConfig } = require("../models/appConfigModel");
const {
  getActiveTestCatalogByIds,
  snapshotTest,
} = require("../models/testCatalogModel");
const {
  getCoachRecommendedTestRecordById,
} = require("../models/coachRecommendedTestModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
} = require("./dietPlanControllerHelpers");

const S3_FOLDER = "test-recommendations";

function readRecommendationIdParam(req) {
  return String(req.params.recommendationId || req.params.id || "").trim();
}

function parseTestIds(body) {
  let raw = body?.testIds;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return [...new Set(raw.map((id) => String(id || "").trim()).filter(Boolean))];
}

function parseReportDate(body) {
  return String(body?.reportDate || "").trim();
}

async function loadRecommendationForUser(recommendationId, userId) {
  const record = await getCoachRecommendedTestRecordById(recommendationId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Test recommendation not found", 404);
  }
  return record;
}

async function buildTestSnapshots(input) {
  const ids = Array.isArray(input)
    ? [...new Set(input.map((id) => String(id || "").trim()).filter(Boolean))]
    : parseTestIds({ testIds: input });
  if (ids.length === 0) {
    throw new AppError("At least one test must be selected", 400);
  }

  const tests = await getActiveTestCatalogByIds(ids);
  if (tests.length !== ids.length) {
    throw new AppError("One or more selected tests are invalid or inactive", 400);
  }

  const order = new Map(ids.map((id, index) => [id, index]));
  tests.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return tests.map((test) => snapshotTest(test)).filter(Boolean);
}

async function generateAndUploadRecommendationPdf({ user, coach, reportDate, tests }) {
  const appConfig = await getAppConfig();
  const pdfBuffer = await generateTestRecommendationPdf({
    user: { name: user.name, email: user.email },
    coach: coach ? { name: coach.name } : null,
    reportDate,
    tests,
    appName: appConfig?.appName || "Wellness",
  });

  const pdfKey = await uploadBufferToS3({
    buffer: pdfBuffer,
    contentType: "application/pdf",
    folder: S3_FOLDER,
    originalName: "recommendation.pdf",
  });

  if (!pdfKey) {
    throw new AppError("Failed to upload recommendation PDF", 500);
  }

  return pdfKey;
}

module.exports = {
  readUserIdParam,
  readRecommendationIdParam,
  parseTestIds,
  parseReportDate,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
  buildTestSnapshots,
  generateAndUploadRecommendationPdf,
};
