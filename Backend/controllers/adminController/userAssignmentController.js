const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, listUsersByParentCoachId, listUsersByAssignedCoachId, normalizeUserTier } = require("../../models/userModel");
const { convertSeekToHeal } = require("../../models/userConversionModel");
const { assignPendingHealUser, reassignHealUser } = require("../../models/userAssignmentModel");
const { getWellnessCoachRecordById } = require("../../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const { enrichUser } = require("../userController/userProfileHelpers");

function mapAssignmentError(err) {
  if (err?.name === "NotFoundError") throw new AppError("User not found", 404);
  if (err?.name === "AlreadyConvertedError") throw new AppError(err.message, 409);
  if (err?.name === "InvalidReferralCodeError") throw new AppError(err.message, 400);
  if (err?.name === "InvalidHealAssignmentError") throw new AppError(err.message, 400);
  if (err?.name === "ImmutableFieldError") throw new AppError(err.message, 400);
  throw err;
}

async function resolveParentCoachId({ assignedCoachId, assignedCoachType, parentCoachId }) {
  const coachId = String(assignedCoachId || "").trim();
  const coachType = String(assignedCoachType || "").trim().toLowerCase();
  const explicitParent = String(parentCoachId || "").trim();

  if (coachType === "wellness_coach") {
    const coach = await getWellnessCoachRecordById(coachId);
    if (!coach) throw new AppError("Wellness coach not found", 404);
    return coach.id;
  }

  if (coachType === "assistant_wellness_coach") {
    const assistant = await getAssistantWellnessCoachById(coachId);
    if (!assistant) throw new AppError("Assistant wellness coach not found", 404);
    const resolvedParent = String(assistant.wellnessCoachId || "").trim();
    if (explicitParent && explicitParent !== resolvedParent) {
      throw new AppError("parentCoachId must match the assistant's wellness coach", 400);
    }
    return resolvedParent;
  }

  throw new AppError("assignedCoachType must be wellness_coach or assistant_wellness_coach", 400);
}

exports.convertUserToHealController = asyncHandler(async (req, res) => {
  const referralCode = req.body?.referralCode ?? req.body?.referral_code ?? null;
  let user;
  try {
    user = await convertSeekToHeal(req.params.id, { referralCode });
  } catch (err) {
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
    });
  } catch (err) {
    mapAssignmentError(err);
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

exports.listHealUsersByCoachController = asyncHandler(async (req, res) => {
  const coachId = req.params.coachId || req.params.id;
  const coach = await getWellnessCoachRecordById(coachId);
  if (!coach) throw new AppError("Wellness coach not found", 404);

  const { page = 1, limit = 20, search } = req.query;
  const data = await listUsersByParentCoachId(coachId, { page, limit, search, userTier: "heal" });
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
  const data = await listUsersByParentCoachId(coachId, { page, limit, search, userTier: "heal", scope });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));

  return res.status(200).json({
    status: true,
    users,
    pagination: data.pagination,
    scope: String(scope || "all").toLowerCase(),
  });
});

exports.listHealUsersForAssistantPortalController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub || req.user?.id;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const assistant = await getAssistantWellnessCoachById(assistantId);
  if (!assistant) throw new AppError("Account not found", 401);

  const parentCoachId = String(assistant.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant is not linked to a wellness coach", 400);

  const { page = 1, limit = 20, search } = req.query;
  const data = await listUsersByAssignedCoachId(assistantId, {
    parentCoachId,
    page,
    limit,
    search,
    userTier: "heal",
  });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));

  return res.status(200).json({
    status: true,
    users,
    pagination: data.pagination,
  });
});

exports.reassignHealUserForCoachPortalController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub || req.user?.id;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);
  if (normalizeUserTier(current.userTier) !== "heal") {
    throw new AppError("Only Heal users can be reassigned", 400);
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
