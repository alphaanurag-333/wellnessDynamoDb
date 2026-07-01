const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createMealLog,
  updateMealLog,
  deleteMealLog,
  getUserMealSummary,
} = require("../../models/mealTrackingModel");
const {
  readUserIdParam,
  readLogIdParam,
  parseMealLogBody,
  loadTargetUser,
  assertHealTierUser,
  assertAssistantCanAccessUser,
  loadMealLogForUser,
  handleValidationError,
  uploadMealPhoto,
  resolveCoachIdForUser,
} = require("../mealTrackingControllerHelpers");
const { isValidDateOnly } = require("../../utils/dateOnly");
const { updateUser, toPublicUser } = require("../../models/userModel");
const { normalizeMealTrackingMode } = require("../../models/userModel");

exports.listAssistantUserMealTrackingController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const date = req.query.date && isValidDateOnly(req.query.date)
    ? req.query.date
    : undefined;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  const summary = await getUserMealSummary(userId, { date, days });

  return res.status(200).json({
    status: true,
    message: "Meal tracking fetched successfully",
    logs: summary.logs,
    macroSummary: summary.macroSummary,
    range: summary.range,
    mealTrackingMode: user.mealTrackingMode || "macro",
  });
});

exports.createAssistantUserMealLogController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const photoKey = await uploadMealPhoto(req);
  const payload = parseMealLogBody(req.body);

  let mealLog;
  try {
    mealLog = await createMealLog({
      userId,
      coachId: resolveCoachIdForUser(user),
      ...payload,
      ...(photoKey !== undefined ? { photoKey } : {}),
      loggedByRole: "assistant_wellness_coach",
      loggedById: actingAssistantId,
      assignedCoachId: actingAssistantId,
      assignedCoachType: "assistant_wellness_coach",
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Meal log created successfully",
    mealLog,
  });
});

exports.updateAssistantUserMealLogController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);
  await loadMealLogForUser(logId, userId);

  const photoKey = await uploadMealPhoto(req);
  const payload = parseMealLogBody(req.body);

  let updated;
  try {
    updated = await updateMealLog(logId, {
      ...payload,
      ...(photoKey !== undefined ? { photoKey } : {}),
    });
  } catch (err) {
    if (
      err?.name === "ConditionalCheckFailedException" ||
      err?.name === "NotFoundError"
    ) {
      throw new AppError("Meal log not found", 404);
    }
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Meal log updated successfully",
    mealLog: updated,
  });
});

exports.deleteAssistantUserMealLogController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);
  await loadMealLogForUser(logId, userId);

  try {
    await deleteMealLog(logId);
  } catch (err) {
    if (
      err?.name === "ConditionalCheckFailedException" ||
      err?.name === "NotFoundError"
    ) {
      throw new AppError("Meal log not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Meal log deleted successfully",
  });
});

exports.updateAssistantUserMealTrackingModeController = asyncHandler(async (req, res) => {
  const actingAssistantId = req.auth?.sub;
  if (!actingAssistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, actingAssistantId);
  assertHealTierUser(user);

  const mode = normalizeMealTrackingMode(req.body?.mealTrackingMode);
  const updated = await updateUser(userId, { mealTrackingMode: mode });

  return res.status(200).json({
    status: true,
    message: "Meal tracking mode updated successfully",
    user: toPublicUser(updated),
    mealTrackingMode: mode,
  });
});
