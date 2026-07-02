const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  assignMentalWellbeingToUser,
  listAssignedMentalWellbeingByUserId,
  deleteAssignedMentalWellbeing,
} = require("../../models/assignedMentalWellbeingModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  dispatchMentalWellbeingAssignedNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseMentalWellbeingIds,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
} = require("../mentalWellbeingAssignmentControllerHelpers");

exports.listCoachUserMentalWellbeingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);

  const assignments = await listAssignedMentalWellbeingByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Mental wellbeing content fetched successfully",
    assignments,
  });
});

exports.createCoachUserMentalWellbeingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);

  const mentalWellbeingIds = parseMentalWellbeingIds(req.body);
  if (mentalWellbeingIds.length === 0) {
    throw new AppError("At least one item must be selected", 400);
  }

  let result;
  try {
    result = await assignMentalWellbeingToUser({
      userId,
      mentalWellbeingIds,
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
    dispatchMentalWellbeingAssignedNotification({
      userId,
      coachName,
      count: result.created.length,
    }).catch((err) => {
      console.error("Mental wellbeing assignment notification failed:", err?.message || err);
    });
  }

  return res.status(201).json({
    status: true,
    message: "Mental wellbeing content assigned successfully",
    assignments: result.created,
    skippedInvalid: result.skippedInvalid,
    skippedDuplicate: result.skippedDuplicate,
  });
});

exports.deleteCoachUserMentalWellbeingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  try {
    await deleteAssignedMentalWellbeing(assignmentId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Mental wellbeing assignment not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Mental wellbeing item removed successfully",
  });
});
