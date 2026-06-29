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
  readUserIdParam,
  readReminderIdParam,
  parseReminderBody,
  handleValidationError,
  loadTargetUser,
  assertCoachCanAccessUser,
  loadReminderForUser,
} = require("../reminderControllerHelpers");

exports.listCoachUserRemindersController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);

  const reminders = await listRemindersByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Reminders fetched successfully",
    reminders,
  });
});

exports.createCoachUserReminderController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);

  const payload = parseReminderBody(req.body);

  let reminder;
  try {
    reminder = await createReminder({
      userId,
      ...payload,
      createdByRole: "wellness_coach",
      createdById: actingCoachId,
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

exports.updateCoachUserReminderController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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

exports.toggleCoachUserReminderController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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

exports.deleteCoachUserReminderController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const reminderId = readReminderIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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
