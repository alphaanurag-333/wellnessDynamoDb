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
  assertCoachCanAccessUser,
  loadMealLogForUser,
  handleValidationError,
  uploadMealPhoto,
  resolveCoachIdForUser,
} = require("../mealTrackingControllerHelpers");
const { isValidDateOnly } = require("../../utils/dateOnly");

exports.listCoachUserMealTrackingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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
  });
});

exports.createCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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
      loggedByRole: "wellness_coach",
      loggedById: actingCoachId,
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

exports.updateCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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

exports.deleteCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
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
