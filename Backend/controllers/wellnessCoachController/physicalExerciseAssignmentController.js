const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  assignPhysicalExercisesToUser,
  listAssignedPhysicalExercisesByUserId,
  deleteAssignedPhysicalExercise,
} = require("../../models/assignedPhysicalExerciseModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  dispatchPhysicalExerciseAssignedNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseExerciseIds,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
} = require("../physicalExerciseAssignmentControllerHelpers");

exports.listCoachUserPhysicalExercisesController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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
  await assertCoachCanAccessUser(user, actingCoachId);
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
      assignedByRole: "wellness_coach",
      assignedById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  if (result.created.length > 0) {
    const coach = await getWellnessCoachById(actingCoachId);
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
  await assertCoachCanAccessUser(user, actingCoachId);
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
