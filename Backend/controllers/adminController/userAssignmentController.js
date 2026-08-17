const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, updateUser, listUsersByParentCoachId, listUsersByAssignedCoachId, listPendingAssignmentUsers, normalizeUserTier } = require("../../models/userModel");
const {
  convertHealToSeek,
  convertHealToMaintenance,
  convertMaintenanceToHeal,
} = require("../../models/userConversionModel");
const {
  adminConvertUserToHeal,
  setupPaidClientEntitlements,
} = require("../../services/adminHealConversionService");
const { assignPendingHealUser, reassignHealUser } = require("../../models/userAssignmentModel");
const { getWellnessCoachRecordById } = require("../../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const {
  getWellnessCoachByIdResolved,
  getAssistantWellnessCoachByIdResolved,
} = require("../../services/accountResolver");
const { sendCoachAssignmentNotifications } = require("../../utils/whatsapp");
const { emitCoachAssigned } = require("../../services/adminActivityService");

const { enrichUser } = require("../userController/userProfileHelpers");
const {
  listHealUsersForStaff,
  resolveStaffActor,
  assertStaffCanAccessUser,
  assertStaffCanAssignCoach,
} = require("../staffAccess");

function mapAssignmentError(err) {
  if (err?.name === "NotFoundError") throw new AppError("User not found", 404);
  if (err?.name === "AlreadyConvertedError") throw new AppError(err.message, 409);
  if (err?.name === "InvalidReferralCodeError") throw new AppError(err.message, 400);
  if (err?.name === "InvalidHealAssignmentError") throw new AppError(err.message, 400);
  if (err?.name === "InvalidTierError") throw new AppError(err.message, 400);
  if (err?.name === "ImmutableFieldError") throw new AppError(err.message, 400);
  throw err;
}

async function resolveParentCoachId({ assignedCoachId, assignedCoachType, parentCoachId }) {
  const coachId = String(assignedCoachId || "").trim();
  const coachType = String(assignedCoachType || "").trim().toLowerCase();
  const explicitParent = String(parentCoachId || "").trim();

  if (coachType === "wellness_coach") {
    const coach =
      (await getWellnessCoachByIdResolved(coachId)) ||
      (await getWellnessCoachRecordById(coachId));
    if (!coach) throw new AppError("Wellness coach not found", 404);
    return coach.id;
  }

  if (coachType === "assistant_wellness_coach") {
    const assistant =
      (await getAssistantWellnessCoachByIdResolved(coachId)) ||
      (await getAssistantWellnessCoachById(coachId));
    if (!assistant) throw new AppError("Assistant wellness coach not found", 404);
    const resolvedParent = String(
      assistant.wellnessCoachId || assistant.parentAccountId || ""
    ).trim();
    if (!resolvedParent) {
      throw new AppError("Assistant wellness coach has no parent coach", 400);
    }
    if (explicitParent && explicitParent !== resolvedParent) {
      throw new AppError("parentCoachId must match the assistant's wellness coach", 400);
    }
    return resolvedParent;
  }

  throw new AppError("assignedCoachType must be wellness_coach or assistant_wellness_coach", 400);
}

exports.convertUserToSeekController = asyncHandler(async (req, res) => {
  let user;
  try {
    user = await convertHealToSeek(req.params.id);
  } catch (err) {
    mapAssignmentError(err);
  }

  return res.status(200).json({
    status: true,
    message: "User downgraded to Seek successfully",
    user: await enrichUser(user),
  });
});

exports.convertUserToMaintenanceController = asyncHandler(async (req, res) => {
  let user;
  try {
    user = await convertHealToMaintenance(req.params.id);
  } catch (err) {
    mapAssignmentError(err);
  }
  return res.status(200).json({
    status: true,
    message: "User moved to maintenance successfully",
    user: await enrichUser(user),
  });
});

exports.convertMaintenanceUserToHealController = asyncHandler(async (req, res) => {
  let user;
  try {
    user = await convertMaintenanceToHeal(req.params.id);
  } catch (err) {
    mapAssignmentError(err);
  }
  return res.status(200).json({
    status: true,
    message: "Maintenance user moved back to Heal successfully",
    user: await enrichUser(user),
  });
});

exports.convertUserToHealController = asyncHandler(async (req, res) => {
  const referralCode = req.body?.referralCode ?? req.body?.referral_code ?? null;
  const catalogProgramId = req.body?.catalogProgramId ?? req.body?.catalog_program_id ?? null;
  let user;
  try {
    user = await adminConvertUserToHeal(req.params.id, { referralCode, catalogProgramId });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    mapAssignmentError(err);
  }

  return res.status(200).json({
    status: true,
    message: "User converted to Heal successfully",
    user: await enrichUser(user),
  });
});

exports.assignHealUserController = asyncHandler(async (req, res) => {
  const assignedCoachId = req.body?.assignedCoachId ?? req.body?.assigned_coach_id;
  const assignedCoachType = req.body?.assignedCoachType ?? req.body?.assigned_coach_type;
  await assertStaffCanAssignCoach(req, req.params.id, { assignedCoachId, assignedCoachType });
  const parentCoachId = await resolveParentCoachId({
    assignedCoachId,
    assignedCoachType,
    parentCoachId: req.body?.parentCoachId ?? req.body?.parent_coach_id,
  });

  let user;
  try {
    user = await assignPendingHealUser(req.params.id, {
      assignedCoachId,
      assignedCoachType,
      parentCoachId,
      assignmentSource: "admin_manual",
    });
  } catch (err) {
    mapAssignmentError(err);
  }

  if (normalizeUserTier(user.userTier) === "heal") {
    const needsEntitlements = !user.programPurchased || !user.energyExchangeEnabled;
    if (needsEntitlements) {
      try {
        user = await setupPaidClientEntitlements(user);
      } catch (err) {
        if (err?.name === "ValidationError") throw new AppError(err.message, 400);
        throw err;
      }
    }
    if (!user.healPaidAt) {
      const onboardingPatches =
        user.paidOnboardingCompleted === true
          ? { healPaidAt: new Date().toISOString() }
          : {
              healPaidAt: new Date().toISOString(),
              paidOnboardingCompleted: false,
              paidOnboardingStep: "register",
              paidOnboardingStepStatus: null,
            };
      user = await updateUser(user.id, onboardingPatches);
    }
  }

  try {
    const assignee =
      assignedCoachType === "assistant_wellness_coach"
        ? (await getAssistantWellnessCoachByIdResolved(assignedCoachId)) ||
          (await getAssistantWellnessCoachById(assignedCoachId))
        : (await getWellnessCoachByIdResolved(assignedCoachId)) ||
          (await getWellnessCoachRecordById(assignedCoachId));
    await sendCoachAssignmentNotifications({ user, assignee, assigneeType: assignedCoachType });
    emitCoachAssigned({
      user,
      assigneeName: assignee?.name,
      assigneeType: assignedCoachType,
      action: "assigned",
    });
  } catch (err) {
    console.error("[UserAssignment] assignment notification failed", err.message);
  }

  return res.status(200).json({
    status: true,
    message: "Coach assigned successfully",
    user: await enrichUser(user),
  });
});

exports.reassignHealUserController = asyncHandler(async (req, res) => {
  const assignedCoachId = req.body?.assignedCoachId ?? req.body?.assigned_coach_id;
  const assignedCoachType = req.body?.assignedCoachType ?? req.body?.assigned_coach_type;
  await assertStaffCanAssignCoach(req, req.params.id, { assignedCoachId, assignedCoachType });
  const parentCoachId = await resolveParentCoachId({
    assignedCoachId,
    assignedCoachType,
    parentCoachId: req.body?.parentCoachId ?? req.body?.parent_coach_id,
  });

  let user;
  try {
    user = await reassignHealUser(req.params.id, {
      assignedCoachId,
      assignedCoachType,
      parentCoachId,
    });
  } catch (err) {
    mapAssignmentError(err);
  }

  try {
    const assignee =
      assignedCoachType === "assistant_wellness_coach"
        ? (await getAssistantWellnessCoachByIdResolved(assignedCoachId)) ||
          (await getAssistantWellnessCoachById(assignedCoachId))
        : (await getWellnessCoachByIdResolved(assignedCoachId)) ||
          (await getWellnessCoachRecordById(assignedCoachId));
    emitCoachAssigned({
      user,
      assigneeName: assignee?.name,
      assigneeType: assignedCoachType,
      action: "reassigned",
    });
  } catch (err) {
    console.error("[UserAssignment] reassignment activity failed", err.message);
  }

  return res.status(200).json({
    status: true,
    message: "User reassigned successfully",
    user: await enrichUser(user),
  });
});

exports.listPendingAssignmentUsersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, userTier } = req.query;
  const data = await listPendingAssignmentUsers({ page, limit, search, userTier });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));

  return res.status(200).json({
    status: true,
    message: "Pending manual assignment users fetched",
    users,
    pagination: data.pagination,
  });
});

exports.listHealUsersByCoachController = asyncHandler(async (req, res) => {
  const coachId = req.params.coachId || req.params.id;
  const coach = await getWellnessCoachRecordById(coachId);
  if (!coach) throw new AppError("Wellness coach not found", 404);

  const { page = 1, limit = 20, search } = req.query;
  const data = await listUsersByParentCoachId(coachId, { page, limit, search, userTier: "client" });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));

  return res.status(200).json({
    status: true,
    users,
    pagination: data.pagination,
  });
});

exports.listHealUsersForStaffController = asyncHandler(async (req, res) => {
  const { search, scope = "all" } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
  const data = await listHealUsersForStaff(req, { page, limit, search, scope, userTier: "client" });
  const users = await Promise.all(data.users.map((u) => enrichUser(u, { ensureReferral: false })));

  return res.status(200).json({
    status: true,
    users,
    pagination: data.pagination,
    scope: String(scope || "all").toLowerCase(),
  });
});

exports.listHealUsersForCoachPortalController = exports.listHealUsersForStaffController;
exports.listHealUsersForAssistantPortalController = exports.listHealUsersForStaffController;

exports.reassignHealUserForStaffController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  if (actor.role !== "admin" && actor.role !== "wellness_coach") {
    throw new AppError("Forbidden", 403);
  }

  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);
  if (normalizeUserTier(current.userTier) !== "heal" && normalizeUserTier(current.userTier) !== "consultancy_only") {
    throw new AppError("Only assigned clients can be reassigned", 400);
  }
  if (actor.role === "wellness_coach") {
    await assertStaffCanAccessUser(req, current);
  }

  const assignedCoachId = req.body?.assignedCoachId ?? req.body?.assigned_coach_id;
  const assignedCoachType = req.body?.assignedCoachType ?? req.body?.assigned_coach_type;
  const parentCoachId = await resolveParentCoachId({
    assignedCoachId,
    assignedCoachType,
    parentCoachId:
      actor.role === "wellness_coach"
        ? actor.id
        : req.body?.parentCoachId ?? req.body?.parent_coach_id ?? current.parentCoachId,
  });

  let user;
  try {
    user = await reassignHealUser(
      req.params.id,
      { assignedCoachId, assignedCoachType, parentCoachId },
      { actingCoachId: actor.role === "wellness_coach" ? actor.id : undefined }
    );
  } catch (err) {
    mapAssignmentError(err);
  }

  return res.status(200).json({
    status: true,
    message: "User reassigned successfully",
    user: await enrichUser(user),
  });
});

exports.reassignHealUserForCoachPortalController = exports.reassignHealUserForStaffController;
