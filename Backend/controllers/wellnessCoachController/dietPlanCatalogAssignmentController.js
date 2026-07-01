const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachAssignedDietPlan,
  listCoachAssignedDietPlansByUserId,
  deleteCoachAssignedDietPlan,
} = require("../../models/coachAssignedDietPlanModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const {
  dispatchDietPlanAssignmentNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readAssignmentIdParam,
  parseStartDate,
  parseNote,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  buildPlanSnapshots,
  generateAndUploadAssignmentPdf,
} = require("../dietPlanCatalogControllerHelpers");

exports.listCoachUserDietPlanAssignmentsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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

exports.createCoachUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);

  const startDate = parseStartDate(req.body);
  if (!startDate) throw new AppError("startDate is required", 400);

  const note = parseNote(req.body);
  const plans = await buildPlanSnapshots(req.body.planIds);
  const coach = await getWellnessCoachById(actingCoachId);

  const pdfKey = await generateAndUploadAssignmentPdf({
    user,
    coach,
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
      createdByRole: "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coachName = coach?.name || "Your coach";
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

exports.deleteCoachUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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
