const AppError = require("../utils/AppError");
const { uploadBufferToS3 } = require("../utils/s3");
const { generateDietPlanAssignmentPdf } = require("../utils/dietPlanAssignmentPdf");
const { getAppConfig } = require("../models/appConfigModel");
const {
  getActiveDietPlanCatalogByIds,
  snapshotPlan,
} = require("../models/dietPlanCatalogModel");
const {
  getCoachAssignedDietPlanRecordById,
} = require("../models/coachAssignedDietPlanModel");
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

const S3_FOLDER = "diet-plan-assignments";

function readAssignmentIdParam(req) {
  return String(req.params.assignmentId || req.params.id || "").trim();
}

function parsePlanIds(body) {
  let raw = body?.planIds;
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

function parseStartDate(body) {
  return String(body?.startDate || "").trim();
}

function parseNote(body) {
  if (body?.note === undefined || body?.note === null) return undefined;
  return String(body.note).trim();
}

async function loadAssignmentForUser(assignmentId, userId) {
  const record = await getCoachAssignedDietPlanRecordById(assignmentId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Diet plan assignment not found", 404);
  }
  return record;
}

async function buildPlanSnapshots(input) {
  const ids = Array.isArray(input)
    ? [...new Set(input.map((id) => String(id || "").trim()).filter(Boolean))]
    : parsePlanIds({ planIds: input });
  if (ids.length === 0) {
    throw new AppError("At least one diet plan must be selected", 400);
  }

  const plans = await getActiveDietPlanCatalogByIds(ids);
  if (plans.length !== ids.length) {
    throw new AppError("One or more selected diet plans are invalid or inactive", 400);
  }

  const order = new Map(ids.map((id, index) => [id, index]));
  plans.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

  return plans.map((plan) => snapshotPlan(plan)).filter(Boolean);
}

async function generateAndUploadAssignmentPdf({ user, coach, startDate, note, plans }) {
  const appConfig = await getAppConfig();
  const pdfBuffer = await generateDietPlanAssignmentPdf({
    user: { name: user.name, email: user.email },
    coach: coach ? { name: coach.name } : null,
    startDate,
    note,
    plans,
    appName: appConfig?.appName || "Wellness",
  });

  const pdfKey = await uploadBufferToS3({
    buffer: pdfBuffer,
    contentType: "application/pdf",
    folder: S3_FOLDER,
    originalName: "diet-plan.pdf",
  });

  if (!pdfKey) {
    throw new AppError("Failed to upload diet plan PDF", 500);
  }

  return pdfKey;
}

module.exports = {
  readUserIdParam,
  readAssignmentIdParam,
  parsePlanIds,
  parseStartDate,
  parseNote,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  buildPlanSnapshots,
  generateAndUploadAssignmentPdf,
};
