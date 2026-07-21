const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  createCoachAssignedWellnessPrescription,
  listCoachAssignedWellnessPrescriptionsByUserId,
  deleteCoachAssignedWellnessPrescription,
} = require("../../../models/coachAssignedWellnessPrescriptionModel");
const { getAdminById } = require("../../../models/adminModel");
const { getWellnessCoachById } = require("../../../models/wellnessCoachModel");
const {
  dispatchWellnessPrescriptionAssignedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseAssignmentDate,
  parsePrescriptionIds,
  parseCustomPoints,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  buildAssignmentItems,
} = require("../../wellnessPrescriptionControllerHelpers");

exports.listAdminUserWellnessPrescriptionsController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const assignments = await listCoachAssignedWellnessPrescriptionsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Wellness prescriptions fetched successfully",
    assignments,
    recommended: assignments[0] || null,
    history: assignments.length > 1 ? assignments.slice(1) : [],
  });
});

exports.createAdminUserWellnessPrescriptionController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const date = parseAssignmentDate(req.body);
  if (!date) throw new AppError("date is required", 400);

  const prescriptionIds = parsePrescriptionIds(req.body);
  const customPoints = parseCustomPoints(req.body);
  const { items, sourcePrescriptionIds } = await buildAssignmentItems({
    prescriptionIds,
    customPoints,
  });

  const admin = await getAdminById(adminId);
  const coach = admin?.wellnessCoachId
    ? await getWellnessCoachById(admin.wellnessCoachId)
    : null;

  let assignment;
  try {
    assignment = await createCoachAssignedWellnessPrescription({
      userId,
      coachId: resolveCoachIdForUser(user),
      date,
      items,
      sourcePrescriptionIds,
      createdByRole: "admin",
      createdById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coachName = admin?.name || coach?.name || "Your coach";
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
    assignment,
  });
});

exports.deleteAdminUserWellnessPrescriptionController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
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

  return res.status(200).json({
    status: true,
    message: "Wellness prescription assignment deleted successfully",
  });
});
