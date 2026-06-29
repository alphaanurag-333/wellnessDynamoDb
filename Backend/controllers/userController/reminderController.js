const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createReminder,
  updateReminder,
  deleteReminder,
  listRemindersByUserId,
  toggleReminderActive,
} = require("../../models/reminderModel");
const {
  parseReminderBody,
  handleValidationError,
  loadReminderForUser,
} = require("../reminderControllerHelpers");

exports.listMyRemindersController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reminders = await listRemindersByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Reminders fetched successfully",
    reminders,
  });
});

exports.createMyReminderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const payload = parseReminderBody(req.body);

  let reminder;
  try {
    reminder = await createReminder({
      userId,
      ...payload,
      createdByRole: "user",
      createdById: userId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Reminder created successfully",
    reminder,
  });
});

exports.updateMyReminderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reminderId = String(req.params.id || "").trim();
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

exports.toggleMyReminderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reminderId = String(req.params.id || "").trim();
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

exports.deleteMyReminderController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reminderId = String(req.params.id || "").trim();
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
