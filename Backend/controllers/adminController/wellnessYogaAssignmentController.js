const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  assignWellnessYogaToUser,
  listAssignedWellnessYogaByUserId,
  deleteAssignedWellnessYoga,
} = require("../../models/assignedWellnessYogaModel");
const {
  dispatchWellnessYogaAssignedNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseYogaIds,
  loadTargetUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
} = require("../helpers/wellnessYogaAssignmentControllerHelpers");

exports.listCoachUserWellnessYogaController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const assignments = await listAssignedWellnessYogaByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Yoga content fetched successfully",
    assignments,
  });
});

exports.createCoachUserWellnessYogaController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const yogaIds = parseYogaIds(req.body);
  if (yogaIds.length === 0) {
    throw new AppError("At least one item must be selected", 400);
  }

  let result;
  try {
    result = await assignWellnessYogaToUser({
      userId,
      yogaIds,
      coachId: resolveCoachIdForUser(user),
      assignedByRole: req.auth?.role || "wellness_coach",
      assignedById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  if (result.created.length > 0) {
    const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
    const coachName = coach?.name || "Your coach";
    dispatchWellnessYogaAssignedNotification({
      userId,
      coachName,
      count: result.created.length,
    }).catch((err) => {
      console.error("Yoga assignment notification failed:", err?.message || err);
    });
  }

  return res.status(201).json({
    status: true,
    message: "Yoga content assigned successfully",
    assignments: result.created,
    skippedInvalid: result.skippedInvalid,
    skippedDuplicate: result.skippedDuplicate,
  });
});

exports.deleteCoachUserWellnessYogaController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  try {
    await deleteAssignedWellnessYoga(assignmentId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Yoga assignment not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Yoga item removed successfully",
  });
});
