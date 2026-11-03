const AppError = require("../../utils/AppError");
const { resolveStaffActor } = require("../staffAccess");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createCoachAssignedDietPlan,
  listCoachAssignedDietPlansByUserId,
  deleteCoachAssignedDietPlan,
  updateCoachAssignedDietPlan,
  isLegacyPublishedAssignment,
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

  let assignment;
  try {
    assignment = await createCoachAssignedDietPlan({
      userId,
      coachId: resolveCoachIdForUser(user),
      startDate,
      note,
      plans,
      createdByRole: req.auth?.role || "wellness_coach",
      createdById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Diet plan saved (draft — use Push to App to publish)",
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
  const startDate = parseStartDate(req.body) || existing.startDate;
  const note = parseNote(req.body);

  const legacyPublishedSnapshot = isLegacyPublishedAssignment(existing)
    && !Array.isArray(existing.publishedPlans)?.length
    ? {
      publishedPlans: existing.plans,
      publishedPdfKey: existing.pdfKey,
      pushedAt: existing.pushedAt || existing.updatedAt || existing.createdAt,
    }
    : null;

  let assignment;
  try {
    assignment = await updateCoachAssignedDietPlan(assignmentId, {
      plans,
      startDate,
      ...(legacyPublishedSnapshot || {}),
      ...(note !== undefined ? { note } : {}),
    });
  } catch (err) {
    handleValidationError(err);
    if (err?.name === "NotFoundError" || err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan assignment not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Diet plan saved (draft — use Push to App to publish)",
    assignment,
    personalisedSections: sectionsFromAssignment(assignment),
  });
});

exports.publishCoachUserDietPlanAssignmentController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const assignmentId = readAssignmentIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  const existing = await loadAssignmentForUser(assignmentId, userId);

  const draftPlans = Array.isArray(existing.plans) ? existing.plans : [];
  if (!draftPlans.length) {
    throw new AppError("Save a diet plan before pushing to the client app", 400);
  }

  const coach = { id: actingCoachId, name: resolveStaffActor(req).displayName };
  const startDate = existing.startDate;
  const note = existing.note;

  const publishedPdfKey = await generateAndUploadAssignmentPdf({
    user,
    coach,
    startDate,
    note,
    plans: draftPlans,
  });

  const previousPublishedPdfKey = existing.publishedPdfKey || (
    existing.pushedAt ? null : existing.pdfKey
  );

  let assignment;
  const pushedAt = new Date().toISOString();
  try {
    assignment = await updateCoachAssignedDietPlan(assignmentId, {
      publishedPlans: draftPlans,
      publishedPdfKey,
      pdfKey: publishedPdfKey,
      pushedAt,
    });
  } catch (err) {
    if (publishedPdfKey) {
      await deleteStoredMedia(publishedPdfKey).catch(() => {});
    }
    handleValidationError(err);
    if (err?.name === "NotFoundError" || err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Diet plan assignment not found", 404);
    }
    throw err;
  }

  if (previousPublishedPdfKey && previousPublishedPdfKey !== publishedPdfKey) {
    await deleteStoredMedia(previousPublishedPdfKey).catch(() => {});
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
    message: "Diet plan pushed to client app",
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
