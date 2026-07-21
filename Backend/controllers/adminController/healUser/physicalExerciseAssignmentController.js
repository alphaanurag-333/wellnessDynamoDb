const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  assignPhysicalExercisesToUser,
  listAssignedPhysicalExercisesByUserId,
  deleteAssignedPhysicalExercise,
} = require("../../../models/assignedPhysicalExerciseModel");
const { getAdminById } = require("../../../models/adminModel");
const { getWellnessCoachById } = require("../../../models/wellnessCoachModel");
const {
  dispatchPhysicalExerciseAssignedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseExerciseIds,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
} = require("../../physicalExerciseAssignmentControllerHelpers");

exports.listAdminUserPhysicalExercisesController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const assignments = await listAssignedPhysicalExercisesByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Physical exercises fetched successfully",
    assignments,
  });
});

exports.createAdminUserPhysicalExercisesController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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
      assignedByRole: "admin_wellness_coach",
      assignedById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  if (result.created.length > 0) {
    const admin = await getAdminById(adminId);
    const coach = admin?.wellnessCoachId
      ? await getWellnessCoachById(admin.wellnessCoachId)
      : null;
    const coachName = admin?.name || coach?.name || "Your coach";
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

exports.deleteAdminUserPhysicalExerciseController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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
