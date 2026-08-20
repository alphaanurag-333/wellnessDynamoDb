const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const { uploadFileFromRequest, deleteStoredMedia } = require("../../utils/s3");
const { getClientIp } = require("../../utils/clientIp");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  listUsers,
  listUsersByParentCoachId,
  isPresentablePicsEnabled,
} = require("../../models/userModel");
const {
  parseUserFields,
  enrichUser,
  assertUniqueEmail,
  assertUniquePhone,
  buildUserUpdatesFromBody,
} = require("../userController/userProfileHelpers");
const { assertStaffCanAccessUser, assertStaffCanMutate } = require("../staffAccess");
const { resolveRegistrationReferralFields } = require("../../services/registrationReferralService");
const { readUserIdParam } = require("../helpers/reminderControllerHelpers");
const {
  dispatchPresentablePicRequestNotification,
} = require("../../services/notificationDispatchService");
const { getSubscriptionExpiryStats } = require("../../services/subscriptionExpiryStats");

const PRESENTABLE_PHOTO_REQUEST_TYPES = new Set([
  "Front pose · gym",
  "Portrait",
  "Full body",
  "Side profile",
  "Progress comparison",
]);

async function resolveSubscriptionExpiryUserIds(query = {}) {
  const windowDays = Number(query.subscriptionExpiryDays);
  if (!Number.isFinite(windowDays) || windowDays <= 0) return null;
  const expiry = await getSubscriptionExpiryStats({ windowDays });
  return Array.isArray(expiry.userIds) ? expiry.userIds : [];
}

exports.listUsersController = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 20));
  const { status, search, userTier, assignmentStatus, parentCoachId, clientCategory } = req.query;
  const subscriptionExpiryUserIds = await resolveSubscriptionExpiryUserIds(req.query);
  if (Array.isArray(subscriptionExpiryUserIds) && subscriptionExpiryUserIds.length === 0) {
    return res.status(200).json({
      status: true,
      users: [],
      pagination: { page, limit, total: 0, pages: 1 },
    });
  }
  const data = parentCoachId
    ? await listUsersByParentCoachId(parentCoachId, {
        page,
        limit,
        search,
        userTier: userTier || "all",
        clientCategory,
        subscriptionExpiryUserIds,
      })
    : await listUsers({
        page,
        limit,
        status,
        search,
        userTier,
        assignmentStatus,
        clientCategory,
        subscriptionExpiryUserIds,
      });
  const users = await Promise.all(data.users.map((u) => enrichUser(u, { ensureReferral: false })));
  return res.status(200).json({ status: true, users, pagination: data.pagination });
});

exports.getUserByIdController = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);
  return res.status(200).json({ status: true, user: await enrichUser(user) });
});

exports.createUserController = asyncHandler(async (req, res) => {
  const { fields, password } = parseUserFields(req.body, { requirePassword: false });

  await assertUniqueEmail(fields.email);
  await assertUniquePhone(fields.phoneCountryCode, fields.phone);

  const uploadedProfile = await uploadFileFromRequest(req, "user");
  if (uploadedProfile) fields.profileImage = uploadedProfile;

  if (password) {
    fields.passwordHash = await hashPassword(password);
  }

  if (fields.termsAccepted && !fields.termsAcceptedAt) {
    fields.termsAcceptedAt = new Date().toISOString();
  }
  if (fields.termsAccepted && !fields.termsAcceptedIp) {
    fields.termsAcceptedIp = getClientIp(req) || null;
  }

  if (fields.primaryHealthConcern) {
    const concern = await getHealthConcernById(fields.primaryHealthConcern);
    if (!concern) throw new AppError("primaryHealthConcern not found", 400);
  }

  const referralCodeInput = req.body?.referralCode ?? req.body?.referral_code ?? null;
  try {
    const referralFields = await resolveRegistrationReferralFields(referralCodeInput, {
      strict: true,
    });
    Object.assign(fields, referralFields);
  } catch (err) {
    if (err?.name === "InvalidReferralCodeError") {
      throw new AppError(err.message || "Invalid referral code", 400);
    }
    throw err;
  }

  const user = await createUser(fields);
  return res.status(201).json({
    status: true,
    message: "User created successfully",
    user: await enrichUser(user),
  });
});

exports.updateUserController = asyncHandler(async (req, res) => {
  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);

  const updates = await buildUserUpdatesFromBody(req.body || {}, current, {
    allowStatus: true,
    req,
  });

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let user;
  try {
    user = await updateUser(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException" || err?.name === "NotFoundError") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "User updated successfully",
    user: await enrichUser(user),
  });
});

exports.deleteUserController = asyncHandler(async (req, res) => {
  const current = await getUserById(req.params.id);
  if (!current) throw new AppError("User not found", 404);
  if (current.profileImage) await deleteStoredMedia(current.profileImage);
  if (current.presentablePic) await deleteStoredMedia(current.presentablePic);
  if (Array.isArray(current.presentablePicHistory)) {
    for (const item of current.presentablePicHistory) {
      if (item?.url) await deleteStoredMedia(item.url);
    }
  }

  try {
    await deleteUser(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "User archived successfully" });
});

exports.patchPresentablePicsSettingsController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const userId = readUserIdParam(req);
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  if (req.body.enabled === undefined && req.body.presentablePicsEnabled === undefined) {
    throw new AppError("enabled is required", 400);
  }

  const raw = req.body.enabled !== undefined ? req.body.enabled : req.body.presentablePicsEnabled;
  const enabled =
    raw === true || raw === false
      ? raw
      : String(raw).trim().toLowerCase() === "true"
        ? true
        : String(raw).trim().toLowerCase() === "false"
          ? false
          : null;
  if (enabled == null) {
    throw new AppError("enabled must be true or false", 400);
  }
  const updated = await updateUser(userId, { presentablePicsEnabled: enabled });

  return res.status(200).json({
    status: true,
    message: enabled
      ? "Presentable pics enabled in the app"
      : "Presentable pics hidden in the app",
    enabled: isPresentablePicsEnabled(updated),
    user: await enrichUser(updated),
  });
});

exports.requestPresentablePicController = asyncHandler(async (req, res) => {
  const actor = assertStaffCanMutate(req);
  const userId = readUserIdParam(req);
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const photoType = String(req.body.photoType || req.body.type || "").trim();
  if (!PRESENTABLE_PHOTO_REQUEST_TYPES.has(photoType)) {
    throw new AppError("Invalid photo type", 400);
  }

  const notification = await dispatchPresentablePicRequestNotification({
    userId,
    photoType,
    coachName: actor.displayName,
    actorUserId: actor.id,
  });

  return res.status(200).json({
    status: true,
    message: "Photo request sent",
    photoType,
    notification,
  });
});

exports.reviewPresentablePicController = asyncHandler(async (req, res) => {
  const actor = assertStaffCanMutate(req);
  const userId = readUserIdParam(req);
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  if (!user.presentablePic) {
    throw new AppError("No presentable pic uploaded", 400);
  }

  const currentStatus = String(user.presentablePicStatus || "pending").toLowerCase();
  if (currentStatus !== "pending") {
    throw new AppError("Presentable pic is not pending approval", 400);
  }

  const action = String(req.body.action || req.body.approvalStatus || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(action)) {
    throw new AppError("action must be approved or rejected", 400);
  }

  const updated = await updateUser(userId, {
    presentablePicStatus: action,
    presentablePicReviewedAt: new Date().toISOString(),
    presentablePicReviewedById: actor.id,
  });

  return res.status(200).json({
    status: true,
    message: `Presentable pic ${action}`,
    user: await enrichUser(updated),
  });
});

exports.parseUserFields = parseUserFields;
exports.assertUniqueEmail = assertUniqueEmail;
exports.assertUniquePhone = assertUniquePhone;
exports.enrichUser = enrichUser;
exports.buildUserUpdatesFromBody = buildUserUpdatesFromBody;
