const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { hashPassword } = require("../../utils/password");
const { uploadFileFromRequest, deleteStoredMedia } = require("../../utils/s3");
const { getHealthConcernById } = require("../../models/healthConcernModel");
const {
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  listUsers,
} = require("../../models/userModel");
const {
  parseUserFields,
  enrichUser,
  assertUniqueEmail,
  assertUniquePhone,
  buildUserUpdatesFromBody,
} = require("../userController/userProfileHelpers");

exports.listUsersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status, search } = req.query;
  const data = await listUsers({ page, limit, status, search });
  const users = await Promise.all(data.users.map((u) => enrichUser(u)));
  return res.status(200).json({ status: true, users, pagination: data.pagination });
});

exports.getUserByIdController = asyncHandler(async (req, res) => {
  const user = await getUserById(req.params.id);
  if (!user) throw new AppError("User not found", 404);
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

  if (fields.primaryHealthConcern) {
    const concern = await getHealthConcernById(fields.primaryHealthConcern);
    if (!concern) throw new AppError("primaryHealthConcern not found", 400);
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

  try {
    await deleteUser(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("User not found", 404);
    }
    throw err;
  }

  return res.status(200).json({ status: true, message: "User deleted successfully" });
});

exports.parseUserFields = parseUserFields;
exports.assertUniqueEmail = assertUniqueEmail;
exports.assertUniquePhone = assertUniquePhone;
exports.enrichUser = enrichUser;
exports.buildUserUpdatesFromBody = buildUserUpdatesFromBody;
