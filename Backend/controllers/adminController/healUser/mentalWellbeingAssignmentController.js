const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  assignMentalWellbeingToUser,
  listAssignedMentalWellbeingByUserId,
  deleteAssignedMentalWellbeing,
} = require("../../../models/assignedMentalWellbeingModel");
const { getAdminById } = require("../../../models/adminModel");
const { getWellnessCoachById } = require("../../../models/wellnessCoachModel");
const {
  dispatchMentalWellbeingAssignedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseMentalWellbeingIds,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
} = require("../../mentalWellbeingAssignmentControllerHelpers");

exports.listAdminUserMentalWellbeingController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const assignments = await listAssignedMentalWellbeingByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Mental wellbeing content fetched successfully",
    assignments,
  });
});

exports.createAdminUserMentalWellbeingController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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

exports.deleteAdminUserMentalWellbeingController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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
