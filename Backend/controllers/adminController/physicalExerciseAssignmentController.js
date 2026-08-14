const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  assignPhysicalExercisesToUser,
  listAssignedPhysicalExercisesByUserId,
  deleteAssignedPhysicalExercise,
} = require("../../models/assignedPhysicalExerciseModel");
const {
  dispatchPhysicalExerciseAssignedNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseExerciseIds,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
} = require("../helpers/physicalExerciseAssignmentControllerHelpers");

exports.listCoachUserPhysicalExercisesController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const assignments = await listAssignedPhysicalExercisesByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Physical exercises fetched successfully",
    assignments,
  });
});

exports.createCoachUserPhysicalExercisesController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const exerciseIds = parseExerciseIds(req.body);
  if (exerciseIds.length === 0) {
    throw new AppError("At least one exercise must be selected", 400);
  }

  let result;
  try {
    result = await assignPhysicalExercisesToUser({
      userId,
      exerciseIds,
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
    dispatchPhysicalExerciseAssignedNotification({
      userId,
      coachName,
      count: result.created.length,
    }).catch((err) => {
      console.error("Physical exercise assignment notification failed:", err?.message || err);
    });
  }

  return res.status(201).json({
    status: true,
    message: "Physical exercises assigned successfully",
    assignments: result.created,
    skippedInvalid: result.skippedInvalid,
    skippedDuplicate: result.skippedDuplicate,
  });
});

exports.deleteCoachUserPhysicalExerciseController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  try {
    await deleteAssignedPhysicalExercise(assignmentId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Physical exercise assignment not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Physical exercise removed successfully",
  });
});
