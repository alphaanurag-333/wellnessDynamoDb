const AppError = require("../utils/AppError");
const {
  getActiveWellnessPrescriptionCatalogByIds,
} = require("../models/wellnessPrescriptionCatalogModel");
const {
  getCoachAssignedWellnessPrescriptionRecordById,
} = require("../models/coachAssignedWellnessPrescriptionModel");
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

function readAssignmentIdParam(req) {
  return String(req.params.assignmentId || req.params.id || "").trim();
}

function parseAssignmentDate(body) {
  return String(body?.date || "").trim();
}

function parsePrescriptionIds(body) {
  let raw = body?.prescriptionIds;
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

function parseCustomPoints(body) {
  let raw = body?.customPoints;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      raw = raw.split("\n").map((s) => s.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(raw)) return [];
  return raw.map((point) => String(point || "").trim()).filter(Boolean);
}

async function loadAssignmentForUser(assignmentId, userId) {
  const record = await getCoachAssignedWellnessPrescriptionRecordById(assignmentId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Wellness prescription assignment not found", 404);
  }
  return record;
}

async function buildAssignmentItems({ prescriptionIds, customPoints }) {
  const ids = Array.isArray(prescriptionIds)
    ? [...new Set(prescriptionIds.map((id) => String(id || "").trim()).filter(Boolean))]
    : parsePrescriptionIds({ prescriptionIds });
  const manualPoints = Array.isArray(customPoints)
    ? customPoints.map((p) => String(p || "").trim()).filter(Boolean)
    : parseCustomPoints({ customPoints });

  const items = [];
  const sourcePrescriptionIds = [];

  if (ids.length > 0) {
    const prescriptions = await getActiveWellnessPrescriptionCatalogByIds(ids);
    if (prescriptions.length !== ids.length) {
      throw new AppError(
        "One or more selected wellness prescriptions are invalid or inactive",
        400
      );
    }

    const order = new Map(ids.map((id, index) => [id, index]));
    prescriptions.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));

    for (const prescription of prescriptions) {
      sourcePrescriptionIds.push(prescription.prescriptionId);
      const points = Array.isArray(prescription.points) ? prescription.points : [];
      for (const text of points) {
        items.push({
          prescriptionId: prescription.prescriptionId,
          text: String(text).trim(),
        });
      }
    }
  }

  for (const text of manualPoints) {
    items.push({ prescriptionId: null, text });
  }

  if (items.length === 0) {
    throw new AppError(
      "At least one catalog prescription or custom point is required",
      400
    );
  }

  return { items, sourcePrescriptionIds };
}

module.exports = {
  readUserIdParam,
  readAssignmentIdParam,
  parseAssignmentDate,
  parsePrescriptionIds,
  parseCustomPoints,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertAssistantCanAccessUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  buildAssignmentItems,
};
