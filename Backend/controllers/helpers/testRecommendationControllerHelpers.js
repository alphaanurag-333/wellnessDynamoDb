const AppError = require("../../utils/AppError");
const { uploadBufferToS3 } = require("../../utils/s3");
const { generateTestRecommendationPdf } = require("../../utils/testRecommendationPdf");
const { compressLabReportPdfBuffer } = require("../../utils/labReportPdfCompress");
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

function slugifyName(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "test";
}

function snapshotCustomTests(raw) {
  let list = raw;
  if (typeof list === "string") {
    try {
      list = JSON.parse(list);
    } catch {
      list = [];
    }
  }
  if (!Array.isArray(list)) return [];

  const tests = [];
  list.forEach((test, index) => {
    const name = String(test?.name || "").trim();
    if (!name) return;
    if (name.length < 2) {
      throw new AppError("Custom test names need at least 2 characters", 400);
    }
    const code = String(test?.code || "FBS").trim().toUpperCase().slice(0, 40) || "FBS";
    const hours = Math.max(0, Math.min(168, Math.round(Number(test?.hours) || 0)));
    const post = /^(pfbs|ppbs|pp|post)/i.test(code);
    const rawId = String(test?.itemId || test?.id || "").trim();
    const itemId = rawId.startsWith("custom::") ? rawId : `custom::${rawId || index + 1}`;
    tests.push({
      itemId,
      catalogId: "",
      testId: slugifyName(name),
      name,
      type: "SINGLE",
      category: String(test?.category || "Other").trim() || "Other",
      fastingType: post ? "Post-prandial" : hours > 0 ? "Fasting" : "Non-fasting",
      duration: hours === 1 ? "1 hr" : `${hours} hrs`,
      code,
      hours,
      custom: true,
      parameters: [{ paramId: slugifyName(name), name, unit: "—", refRange: "—" }],
    });
  });
  return tests;
}

async function buildTestSnapshots(input) {
  const body = Array.isArray(input) ? { testIds: input } : (input && typeof input === "object" ? input : {});
  const ids = parseTestIds(body);
  const custom = snapshotCustomTests(body.customTests);

  if (ids.length === 0 && custom.length === 0) {
    throw new AppError("At least one test must be selected", 400);
  }

  if (ids.length === 0) return custom;

  const picks = ids.map((id) => {
    const [catalogId, lineIndex] = id.split(LINE_ID_SEPARATOR);
    return { id, catalogId, lineIndex: lineIndex === undefined ? null : Number(lineIndex) };
  });
  const catalogIds = [...new Set(picks.map((pick) => pick.catalogId).filter(Boolean))];
  const tests = await getActiveTestCatalogByIds(catalogIds);
  if (tests.length !== catalogIds.length) {
    throw new AppError("One or more selected tests are invalid or inactive", 400);
  }
  const byId = new Map(tests.map((test) => [test.id, test]));

  const catalogSnaps = picks.map((pick) => {
    const test = byId.get(pick.catalogId);
    if (!test) {
      throw new AppError("One or more selected tests are invalid or inactive", 400);
    }
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
      code: String(line.code || "").trim(),
      hours: Number.isFinite(Number(line.hours)) ? Number(line.hours) : undefined,
      parameters: param ? [param] : [],
    };
  });

  return [...catalogSnaps, ...custom];
}

async function generateAndUploadRecommendationPdf({ user, coach, reportDate, tests }) {
  const appConfig = await getAppConfig();
  let pdfBuffer = await generateTestRecommendationPdf({
    user: { name: user.name, email: user.email },
    coach: coach ? { name: coach.name } : null,
    reportDate,
    tests,
    appName: appConfig?.appName || "Wellness",
  });

  pdfBuffer = await compressLabReportPdfBuffer(pdfBuffer);

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
