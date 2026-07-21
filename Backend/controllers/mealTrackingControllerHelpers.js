const AppError = require("../utils/AppError");
const { uploadFileFromRequest } = require("../utils/s3");
const { getMealLogRecordById } = require("../models/mealTrackingModel");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  handleValidationError,
} = require("./reminderControllerHelpers");

const S3_FOLDER = "meal-tracking";

/** Placeholder macros until AI photo-scanning is integrated. */
const DUMMY_MACROS = {
  proteinGm: 20,
  fatsGm: 10,
  carbsGm: 30,
  caloriesKcal: 250,
};

function resolveAssignedCoachForUser(user) {
  const assignedCoachType = String(user?.assignedCoachType || "").trim().toLowerCase();
  const assignedCoachId = String(user?.assignedCoachId || "").trim();
  const parentCoachId = String(user?.parentCoachId || "").trim();

  if (assignedCoachType === "assistant_wellness_coach" && assignedCoachId) {
    return {
      assignedCoachId,
      assignedCoachType: "assistant_wellness_coach",
      coachId: parentCoachId || assignedCoachId,
    };
  }

  return {
    assignedCoachId: parentCoachId || assignedCoachId || null,
    assignedCoachType: "wellness_coach",
    coachId: parentCoachId || assignedCoachId || null,
  };
}

function readLogIdParam(req) {
  return String(req.params.logId || req.params.id || "").trim();
}

function parseMealLogBody(body) {
  const payload = {};
  const fields = [
    "date",
    "entryTime",
    "category",
    "mealType",
    "description",
    "items",
    "proteinGm",
    "fatsGm",
    "carbsGm",
    "caloriesKcal",
  ];
  for (const f of fields) {
    if (body?.[f] !== undefined) payload[f] = body[f];
  }
  return payload;
}

function assertHealTierUser(user) {
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError(
      "Meal tracking is only available for Heal (paid) users",
      400
    );
  }
}

async function loadMealLogForUser(logId, userId) {
  const log = await getMealLogRecordById(logId);
  if (!log || String(log.userId || "") !== String(userId)) {
    throw new AppError("Meal log not found", 404);
  }
  return log;
}

async function uploadMealPhoto(req) {
  if (!req?.file?.buffer) return undefined;
  const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowed.includes(req.file.mimetype)) {
    throw new AppError("Only JPEG, PNG, and WebP images are allowed", 400);
  }
  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) throw new AppError("Failed to upload meal photo", 500);
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
  readLogIdParam,
  parseMealLogBody,
  loadTargetUser,
  assertHealTierUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  loadMealLogForUser,
  handleValidationError,
  uploadMealPhoto,
  resolveCoachIdForUser,
  DUMMY_MACROS,
  resolveAssignedCoachForUser,
};
