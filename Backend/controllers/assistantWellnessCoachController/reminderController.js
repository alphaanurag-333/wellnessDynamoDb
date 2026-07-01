const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createReminder,
  updateReminder,
  deleteReminder,
  listRemindersByUserId,
  toggleReminderActive,
} = require("../../models/reminderModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
const {
  dispatchCoachReminderNotification,
} = require("../../services/notificationDispatchService");
const {
  readUserIdParam,
  readReminderIdParam,
  parseReminderBody,
  handleValidationError,
  loadTargetUser,
  assertAssistantCanAccessUser,
  loadReminderForUser,
} = require("../reminderControllerHelpers");

exports.listAssistantUserRemindersController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);

  const reminders = await listRemindersByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Reminders fetched successfully",
    reminders,
  });
});

exports.createAssistantUserReminderController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);

  const payload = parseReminderBody(req.body);

  let reminder;
  try {
    reminder = await createReminder({
      userId,
      ...payload,
      createdByRole: "assistant_wellness_coach",
      createdById: assistantId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const assistant = await getAssistantWellnessCoachById(assistantId);
  dispatchCoachReminderNotification({
    userId,
    reminderId: reminder?.id,
    coachName: assistant?.name,
    reminderName: reminder?.name,
    actorUserId: assistantId,
  }).catch((err) => {
    console.error("Coach reminder notification failed:", err?.message || err);
  });

  return res.status(201).json({
    status: true,
    message: "Reminder created successfully",
    reminder,
  });
});

exports.updateAssistantUserReminderController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
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

exports.toggleAssistantUserReminderController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
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

exports.deleteAssistantUserReminderController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);
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
