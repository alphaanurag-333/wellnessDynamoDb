const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  createReminder,
  updateReminder,
  deleteReminder,
  listRemindersByUserId,
  toggleReminderActive,
} = require("../../../models/reminderModel");
const { getAdminById } = require("../../../models/adminModel");
const {
  dispatchCoachReminderNotification,
} = require("../../../services/notificationDispatchService");
const {
  readUserIdParam,
  readReminderIdParam,
  parseReminderBody,
  handleValidationError,
  loadTargetUser,
  assertAdminCanAccessUser,
  loadReminderForUser,
} = require("../../reminderControllerHelpers");

exports.listAdminUserRemindersController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);

  const reminders = await listRemindersByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Reminders fetched successfully",
    reminders,
  });
});

exports.createAdminUserReminderController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);

  const payload = parseReminderBody(req.body);

  let reminder;
  try {
    reminder = await createReminder({
      userId,
      ...payload,
      createdByRole: "admin",
      createdById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const admin = await getAdminById(adminId);
  dispatchCoachReminderNotification({
    userId,
    reminderId: reminder?.id,
    coachName: admin?.name,
    reminderName: reminder?.name,
    actorUserId: adminId,
  }).catch((err) => {
    console.error("Coach reminder notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Reminder created successfully",
    reminder,
  });
});

exports.updateAdminUserReminderController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  await loadReminderForUser(reminderId, userId);

  const updates = parseReminderBody(req.body, { partial: true });
  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let reminder;
  try {
    reminder = await updateReminder(reminderId, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Reminder not found", 404);
    }
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Reminder updated successfully",
    reminder,
  });
});

exports.toggleAdminUserReminderController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  const current = await loadReminderForUser(reminderId, userId);

  const nextActive =
    req.body?.isActive !== undefined ? Boolean(req.body.isActive) : !Boolean(current.isActive);

  let reminder;
  try {
    reminder = await toggleReminderActive(reminderId, nextActive);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Reminder not found", 404);
    }
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Reminder status updated",
    reminder,
  });
});

exports.deleteAdminUserReminderController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  await loadReminderForUser(reminderId, userId);

  try {
    await deleteReminder(reminderId);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Reminder not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Reminder deleted successfully",
  });
});
