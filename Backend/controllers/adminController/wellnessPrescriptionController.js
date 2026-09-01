const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachAssignedWellnessPrescription,
  updateCoachAssignedWellnessPrescription,
  cancelCoachAssignedWellnessPrescriptionReview,
  deleteCoachAssignedWellnessPrescription,
  toCoachAssignedWellnessPrescriptionPublic,
} = require("../../models/coachAssignedWellnessPrescriptionModel");
const {
  dispatchWellnessPrescriptionAssignedNotification,
} = require("../../services/notificationDispatchService");
const {
  listEnrichedWellnessPrescriptionsForUser,
  syncUserLastReviewedAt,
  enrichAssignmentsWithReviewMeta,
} = require("../../services/wellnessPrescriptionReviewService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseAssignmentDate,
  parsePrescriptionIds,
  parseCustomPoints,
  parseProtocols,
  loadTargetUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  buildAssignmentItems,
} = require("../helpers/wellnessPrescriptionControllerHelpers");

function mapPrescriptionListResponse(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  return {
    assignments: list,
    recommended: list[0] || null,
    history: list.length > 1 ? list.slice(1) : [],
  };
}

exports.listCoachUserWellnessPrescriptionsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const assignments = await listEnrichedWellnessPrescriptionsForUser(userId, user);

  return res.status(200).json({
    status: true,
    message: "Wellness prescriptions fetched successfully",
    ...mapPrescriptionListResponse(assignments),
  });
});

exports.createCoachUserWellnessPrescriptionController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const date = parseAssignmentDate(req.body);
  if (!date) throw new AppError("date is required", 400);

  const prescriptionIds = parsePrescriptionIds(req.body);
  const customPoints = parseCustomPoints(req.body);
  const protocols = parseProtocols(req.body);
  const { items, sourcePrescriptionIds } = await buildAssignmentItems({
    prescriptionIds,
    customPoints,
    protocols,
  });

  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };

  let assignment;
  try {
    assignment = await createCoachAssignedWellnessPrescription({
      userId,
      coachId: resolveCoachIdForUser(user),
      date,
      items,
      sourcePrescriptionIds,
      createdByRole: req.auth?.role || "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  await syncUserLastReviewedAt(userId);
  const [enrichedAssignment] = await enrichAssignmentsWithReviewMeta([assignment], user);

  const coachName = coach?.name || "Your coach";
  dispatchWellnessPrescriptionAssignedNotification({
    userId,
    assignmentId: assignment?.id,
    coachName,
  }).catch((err) => {
    console.error("Wellness prescription assignment notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Wellness prescription assigned successfully",
    assignment: enrichedAssignment || toCoachAssignedWellnessPrescriptionPublic(assignment),
  });
});

exports.updateCoachUserWellnessPrescriptionController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  const date = parseAssignmentDate(req.body) || undefined;
  const prescriptionIds = parsePrescriptionIds(req.body);
  const customPoints = parseCustomPoints(req.body);
  const protocols = parseProtocols(req.body);
  const { items, sourcePrescriptionIds } = await buildAssignmentItems({
    prescriptionIds,
    customPoints,
    protocols,
  });

  let assignment;
  try {
    assignment = await updateCoachAssignedWellnessPrescription(assignmentId, {
      date,
      items,
      sourcePrescriptionIds,
    });
  } catch (err) {
    if (err?.name === "EditWindowExpiredError") {
      throw new AppError(err.message, 403);
    }
    if (err?.name === "NotFoundError" || err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Wellness prescription assignment not found", 404);
    }
    handleValidationError(err);
  }

  await syncUserLastReviewedAt(userId);
  const [enrichedAssignment] = await enrichAssignmentsWithReviewMeta([assignment], user);

  const coachName = resolveStaffActor(req).displayName || "Your coach";
  dispatchWellnessPrescriptionAssignedNotification({
    userId,
    assignmentId: assignment?.id,
    coachName,
    updated: true,
  }).catch((err) => {
    console.error("Wellness prescription re-publish notification failed:", err?.message || err);
  });

  return res.status(200).json({
    status: true,
    message: "Wellness prescription re-published successfully",
    assignment: enrichedAssignment || toCoachAssignedWellnessPrescriptionPublic(assignment),
  });
});

exports.cancelCoachUserWellnessPrescriptionReviewController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  let assignment;
  try {
    assignment = await cancelCoachAssignedWellnessPrescriptionReview(assignmentId, {
      cancelledById: actingCoachId,
    });
  } catch (err) {
    if (err?.name === "NotFoundError" || err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Wellness prescription assignment not found", 404);
    }
    handleValidationError(err);
  }

  await syncUserLastReviewedAt(userId);
  const [enrichedAssignment] = await enrichAssignmentsWithReviewMeta([assignment], user);

  return res.status(200).json({
    status: true,
    message: "Review cancelled successfully",
    assignment: enrichedAssignment || toCoachAssignedWellnessPrescriptionPublic(assignment),
  });
});

exports.deleteCoachUserWellnessPrescriptionController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  try {
    await deleteCoachAssignedWellnessPrescription(assignmentId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Wellness prescription assignment not found", 404);
    }
    throw err;
  }

  await syncUserLastReviewedAt(userId);

  return res.status(200).json({
    status: true,
    message: "Wellness prescription assignment deleted successfully",
  });
});
