const AppError = require("../../utils/AppError");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertStaffCanAccessUser,
  handleValidationError,
  resolveCoachIdForUser,
} = require("./dietPlanControllerHelpers");
const {
  getAssignedWellnessYogaRecordById,
} = require("../../models/assignedWellnessYogaModel");

function readAssignmentIdParam(req) {
  return String(req.params.assignmentId || req.params.id || "").trim();
}

function assertHealTierUser(user) {
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Yoga content can only be assigned to Heal (paid) users", 400);
  }
}

function parseYogaIds(body) {
  let raw = body?.yogaIds;
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
  const record = await getAssignedWellnessYogaRecordById(assignmentId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Yoga assignment not found", 404);
  }
  return record;
}

module.exports = {
  readUserIdParam,
  readAssignmentIdParam,
  parseYogaIds,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
};
