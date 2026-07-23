const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, updateUser, listUsersByParentCoachId, listPendingAssignmentUsers, normalizeUserTier } = require("../../models/userModel");
const { convertHealToSeek } = require("../../models/userConversionModel");
const {
  adminConvertUserToHeal,
  setupPaidClientEntitlements,
} = require("../../services/adminHealConversionService");
const { assignPendingHealUser, reassignHealUser } = require("../../models/userAssignmentModel");
const { getWellnessCoachRecordById } = require("../../models/wellnessCoachModel");
const { sendCoachAssignmentNotifications } = require("../../utils/whatsapp");

const { enrichUser } = require("../userController/userProfileHelpers");

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

  if (coachType === "assistant_wellness_coach") {
    throw new AppError("Assistant wellness coaches are no longer supported", 400);
  }

  if (coachType === "wellness_coach") {
    const coach = await getWellnessCoachRecordById(coachId);
    if (!coach) throw new AppError("Wellness coach not found", 404);
    return coach.id;
  }

  throw new AppError("assignedCoachType must be wellness_coach", 400);
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
    const assignee = await getWellnessCoachRecordById(assignedCoachId);
    await sendCoachAssignmentNotifications({ user, assignee, assigneeType: assignedCoachType });
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

exports.listHealUsersForCoachPortalController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub || req.user?.id;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const { page = 1, limit = 20, search, scope = "all" } = req.query;
  const data = await listUsersByParentCoachId(coachId, { page, limit, search, userTier: "client", scope });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));

  return res.status(200).json({
    status: true,
    users,
    pagination: data.pagination,
    scope: String(scope || "all").toLowerCase(),
  });
});

exports.reassignHealUserForCoachPortalController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub || req.user?.id;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);
  if (normalizeUserTier(current.userTier) !== "heal" && normalizeUserTier(current.userTier) !== "consultancy_only") {
    throw new AppError("Only assigned clients can be reassigned", 400);
  }
  if (String(current.parentCoachId || "") !== String(actingCoachId)) {
    throw new AppError("User is not under your coaching hierarchy", 403);
  }

  const assignedCoachId = req.body?.assignedCoachId ?? req.body?.assigned_coach_id;
  const assignedCoachType = req.body?.assignedCoachType ?? req.body?.assigned_coach_type;
  const parentCoachId = await resolveParentCoachId({
    assignedCoachId,
    assignedCoachType,
    parentCoachId: actingCoachId,
  });

  let user;
  try {
    user = await reassignHealUser(
      req.params.id,
      { assignedCoachId, assignedCoachType, parentCoachId },
      { actingCoachId }
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
