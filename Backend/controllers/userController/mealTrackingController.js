const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getUserMealSummary,
  getMealLogById,
  createMealLog,
  updateMealLog,
  deleteMealLog,
  getMealLogRecordById,
} = require("../../models/mealTrackingModel");
const { isValidDateOnly } = require("../../utils/dateOnly");
const {
  parseMealLogBody,
  uploadMealPhoto,
  handleValidationError,
} = require("../mealTrackingControllerHelpers");

function readLogIdParam(req) {
  return String(req.params.logId || req.params.id || "").trim();
}

async function loadOwnMealLog(logId, userId) {
  const record = await getMealLogRecordById(logId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Meal log not found", 404);
  }
  return record;
}

// GET /api/user/meal-tracking — macro summary + logs for a date range
exports.getUserMealTrackingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

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

// GET /api/user/meal-tracking/:logId — single meal log
exports.getUserMealLogByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  await loadOwnMealLog(logId, userId);
  const mealLog = await getMealLogById(logId);

  return res.status(200).json({
    status: true,
    message: "Meal log fetched successfully",
    mealLog,
  });
});

// POST /api/user/meal-tracking — create a meal log
exports.createUserMealLogController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const photoKey = await uploadMealPhoto(req);
  const payload = parseMealLogBody(req.body);

  let mealLog;
  try {
    mealLog = await createMealLog({
      userId,
      coachId: req.currentUser?.parentCoachId || null,
      ...payload,
      ...(photoKey !== undefined ? { photoKey } : {}),
      loggedByRole: "user",
      loggedById: userId,
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

// PUT /api/user/meal-tracking/:logId — update own meal log
exports.updateUserMealLogController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  await loadOwnMealLog(logId, userId);

  const photoKey = await uploadMealPhoto(req);
  const payload = parseMealLogBody(req.body);

  let mealLog;
  try {
    mealLog = await updateMealLog(logId, {
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
    mealLog,
  });
});

// DELETE /api/user/meal-tracking/:logId — delete own meal log
exports.deleteUserMealLogController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  await loadOwnMealLog(logId, userId);

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
