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
  getAssignedPhysicalExerciseRecordById,
} = require("../../models/assignedPhysicalExerciseModel");

function readAssignmentIdParam(req) {
  return String(req.params.assignmentId || req.params.id || "").trim();
}

const { isStaffPaidFeatureTier } = require("../../services/paidFeatureAccessService");

function assertHealTierUser(user) {
  if (!isStaffPaidFeatureTier(user)) {
    throw new AppError("Physical exercises can only be assigned to Heal or Maintenance (paid) users", 400);
  }
}

function parseExerciseIds(body) {
  let raw = body?.exerciseIds;
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
  const record = await getAssignedPhysicalExerciseRecordById(assignmentId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Physical exercise assignment not found", 404);
  }
  return record;
}

module.exports = {
  readUserIdParam,
  readAssignmentIdParam,
  parseExerciseIds,
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
