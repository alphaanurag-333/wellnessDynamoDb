const AppError = require("../utils/AppError");
const { uploadFileFromRequest } = require("../utils/s3");
const { getDietPlanRecordById } = require("../models/dietPlanModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  handleValidationError,
} = require("./reminderControllerHelpers");

const S3_FOLDER = "diet-plans";

function readPlanIdParam(req) {
  return String(req.params.planId || req.params.id || "").trim();
}

function parseDietPlanBody(body) {
  const payload = {};
  if (body?.title !== undefined) payload.title = body.title;
  if (body?.note !== undefined) payload.note = body.note;
  return payload;
}

function assertHealTierUser(user) {
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Diet plans can only be assigned to Heal (paid) users", 400);
  }
}

async function loadDietPlanForUser(planId, userId) {
  const plan = await getDietPlanRecordById(planId);
  if (!plan || String(plan.userId || "") !== String(userId)) {
    throw new AppError("Diet plan not found", 404);
  }
  return plan;
}

function assertPdfUpload(req) {
  if (!req?.file?.buffer) {
    throw new AppError("PDF file is required", 400);
  }
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are allowed", 400);
  }
}

async function uploadDietPlanPdf(req) {
  assertPdfUpload(req);
  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) {
    throw new AppError("Failed to upload diet plan PDF", 500);
  }
  return fileKey;
}

function resolveCoachIdForUser(user) {
  const coachId = String(user.parentCoachId || "").trim();
  if (!coachId) {
    throw new AppError("User does not have an assigned coach hierarchy", 400);
  }
  return coachId;
}

module.exports = {
  readUserIdParam,
  readPlanIdParam,
  parseDietPlanBody,
  loadTargetUser,
  assertHealTierUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  loadDietPlanForUser,
  handleValidationError,
  uploadDietPlanPdf,
  resolveCoachIdForUser,
};
