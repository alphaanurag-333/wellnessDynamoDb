const AppError = require("../../utils/AppError");
const { uploadBufferToS3 } = require("../../utils/s3");
const { generateTestRecommendationPdf } = require("../../utils/testRecommendationPdf");
const { getAppConfig } = require("../../models/appConfigModel");
const {
  getActiveTestCatalogByIds,
  snapshotTest,
} = require("../../models/testCatalogModel");
const {
  getCoachRecommendedTestRecordById,
} = require("../../models/coachRecommendedTestModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
} = require("./dietPlanControllerHelpers");

const S3_FOLDER = "test-recommendations";
const LINE_ID_SEPARATOR = "::";

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

  const picks = ids.map((id) => {
    const [catalogId, lineIndex] = id.split(LINE_ID_SEPARATOR);
    return { id, catalogId, lineIndex: lineIndex === undefined ? null : Number(lineIndex) };
  });
  const catalogIds = [...new Set(picks.map((pick) => pick.catalogId))];
  const tests = await getActiveTestCatalogByIds(catalogIds);
  if (tests.length !== catalogIds.length) {
    throw new AppError("One or more selected tests are invalid or inactive", 400);
  }
  const byId = new Map(tests.map((test) => [test.id, test]));

  return picks.map((pick) => {
    const test = byId.get(pick.catalogId);
    if (pick.lineIndex === null) return snapshotTest(test);
    const line = Array.isArray(test.lines) ? test.lines[pick.lineIndex] : null;
    if (!Number.isInteger(pick.lineIndex) || !line) {
      throw new AppError("One or more selected tests are invalid or inactive", 400);
    }
    const param = (test.parameters || [])[pick.lineIndex];
    return {
      itemId: pick.id,
      catalogId: test.id,
      testId: test.testId,
      panelName: test.name,
      name: line.name,
      type: "SINGLE",
      category: line.category,
      fastingType: line.fastingType,
      duration: line.duration,
      parameters: param ? [param] : [],
    };
  });
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
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadRecommendationForUser,
  buildTestSnapshots,
  generateAndUploadRecommendationPdf,
};
