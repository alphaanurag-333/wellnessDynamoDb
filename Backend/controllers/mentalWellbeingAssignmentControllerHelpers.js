const AppError = require("../utils/AppError");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  handleValidationError,
  resolveCoachIdForUser,
} = require("./dietPlanControllerHelpers");
const {
  getAssignedMentalWellbeingRecordById,
} = require("../models/assignedMentalWellbeingModel");

function readAssignmentIdParam(req) {
  return String(req.params.assignmentId || req.params.id || "").trim();
}

function assertHealTierUser(user) {
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Mental wellbeing content can only be assigned to Heal (paid) users", 400);
  }
}

function parseMentalWellbeingIds(body) {
  let raw = body?.mentalWellbeingIds;
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

async function loadAssignmentForUser(assignmentId, userId) {
  const record = await getAssignedMentalWellbeingRecordById(assignmentId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Mental wellbeing assignment not found", 404);
  }
  return record;
}

module.exports = {
  readUserIdParam,
  readAssignmentIdParam,
  parseMentalWellbeingIds,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
};
