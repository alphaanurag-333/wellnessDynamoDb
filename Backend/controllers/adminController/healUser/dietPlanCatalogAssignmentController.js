const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  createCoachAssignedDietPlan,
  listCoachAssignedDietPlansByUserId,
  deleteCoachAssignedDietPlan,
} = require("../../../models/coachAssignedDietPlanModel");
const { getAdminById } = require("../../../models/adminModel");
const {
  dispatchDietPlanAssignmentNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseStartDate,
  parseNote,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  buildPlanSnapshots,
  generateAndUploadAssignmentPdf,
} = require("../../dietPlanCatalogControllerHelpers");

exports.listAdminUserDietPlanAssignmentsController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const assignments = await listCoachAssignedDietPlansByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Diet plan assignments fetched successfully",
    assignments,
    recommended: assignments[0] || null,
    history: assignments.length > 1 ? assignments.slice(1) : [],
  });
});

exports.createAdminUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);

  const startDate = parseStartDate(req.body);
  if (!startDate) throw new AppError("startDate is required", 400);

  const note = parseNote(req.body);
  const plans = await buildPlanSnapshots(req.body.planIds);
  const admin = await getAdminById(adminId);

  const pdfKey = await generateAndUploadAssignmentPdf({
    user,
    coach: assistant ? { name: admin.name } : null,
    startDate,
    note,
    plans,
  });

  let assignment;
  try {
    assignment = await createCoachAssignedDietPlan({
      userId,
      coachId: resolveCoachIdForUser(user),
      startDate,
      note,
      plans,
      pdfKey,
      createdByRole: "admin",
      createdById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coachName = admin?.name || "Your coach";
  dispatchDietPlanAssignmentNotification({
    userId,
    assignmentId: assignment?.id,
    coachName,
  }).catch((err) => {
    console.error("Diet plan assignment notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Diet plan assigned successfully",
    assignment,
  });
});

exports.deleteAdminUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);
  await loadAssignmentForUser(assignmentId, userId);

  try {
    await deleteCoachAssignedDietPlan(assignmentId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("Diet plan assignment not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan assignment deleted successfully",
  });
});
