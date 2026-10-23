const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachAssignedDietPlan,
  listCoachAssignedDietPlansByUserId,
  deleteCoachAssignedDietPlan,
  updateCoachAssignedDietPlan,
} = require("../../models/coachAssignedDietPlanModel");
const { deleteStoredMedia } = require("../../utils/s3");
const { sectionsFromAssignment } = require("../../utils/personalisedDietPlan");
const {
  updateUser,
  toPublicUser,
  isDietPlanEnabled,
} = require("../../models/userModel");
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
  assertStaffCanAccessUser,
  assertHealTierUser,
  handleValidationError,
  resolveCoachIdForUser,
  loadAssignmentForUser,
  resolveAssignmentPlans,
  generateAndUploadAssignmentPdf,
} = require("../helpers/dietPlanCatalogControllerHelpers");

exports.listCoachUserDietPlanAssignmentsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const assignments = await listCoachAssignedDietPlansByUserId(userId);

  const recommended = assignments[0] || null;
  const personalisedSections = recommended ? sectionsFromAssignment(recommended) : [];

  return res.status(200).json({
    status: true,
    message: "Diet plan assignments fetched successfully",
    assignments,
    recommended,
    history: assignments.length > 1 ? assignments.slice(1) : [],
    dietPlanEnabled: isDietPlanEnabled(user),
    personalisedSections,
  });
});

function parseEnabledFlag(body) {
  const raw = body?.enabled !== undefined ? body.enabled : body?.dietPlanEnabled;
  if (raw === true || raw === false) return raw;
  const next = String(raw ?? "").trim().toLowerCase();
  if (next === "true") return true;
  if (next === "false") return false;
  return null;
}

exports.updateCoachUserDietPlanEnabledController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const enabled = parseEnabledFlag(req.body);
  if (enabled == null) {
    throw new AppError("enabled must be true or false", 400);
  }

  const updated = await updateUser(userId, { dietPlanEnabled: enabled });

  return res.status(200).json({
    status: true,
    message: enabled
      ? "Diet plan enabled in the client app"
      : "Diet plan hidden from the client app",
    dietPlanEnabled: isDietPlanEnabled(updated),
    user: toPublicUser(updated),
  });
});

exports.createCoachUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const startDate = parseStartDate(req.body);
  if (!startDate) throw new AppError("startDate is required", 400);

  const note = parseNote(req.body);
  const plans = await resolveAssignmentPlans(req.body);
  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };

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
      createdByRole: req.auth?.role || "wellness_coach",
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
    personalisedSections: sectionsFromAssignment(assignment),
  });
});

exports.updateCoachUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  const existing = await loadAssignmentForUser(assignmentId, userId);

  const plans = await resolveAssignmentPlans(req.body);
  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
  const startDate = parseStartDate(req.body) || existing.startDate;
  const note = parseNote(req.body);

  const pdfKey = await generateAndUploadAssignmentPdf({
    user,
    coach,
    startDate,
    note: note !== undefined ? note : existing.note,
    plans,
  });

  const previousPdfKey = existing.pdfKey;
  let assignment;
  try {
    assignment = await updateCoachAssignedDietPlan(assignmentId, {
      plans,
      pdfKey,
      startDate,
      ...(note !== undefined ? { note } : {}),
    });
  } catch (err) {
    if (pdfKey && pdfKey !== previousPdfKey) {
      await deleteStoredMedia(pdfKey).catch(() => {});
    }
    handleValidationError(err);
    if (err?.name === "NotFoundError" || err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan assignment not found", 404);
    }
    throw err;
  }

  if (previousPdfKey && previousPdfKey !== pdfKey) {
    await deleteStoredMedia(previousPdfKey).catch(() => {});
  }

  dispatchDietPlanAssignmentNotification({
    userId,
    assignmentId: assignment?.id,
    coachName: coach?.name || "Your coach",
  }).catch((err) => {
    console.error("Diet plan assignment notification failed:", err?.message || err);
  });

  return res.status(200).json({
    status: true,
    message: "Diet plan saved successfully",
    assignment,
    personalisedSections: sectionsFromAssignment(assignment),
  });
});

exports.deleteCoachUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
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
