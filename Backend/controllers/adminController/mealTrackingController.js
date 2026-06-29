const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getUserMealSummary,
  deleteMealLog,
  getMealLogRecordById,
} = require("../../models/mealTrackingModel");
const {
  readUserIdParam,
  readLogIdParam,
  loadTargetUser,
} = require("../mealTrackingControllerHelpers");
const { isValidDateOnly } = require("../../utils/dateOnly");

exports.adminGetUserMealTrackingController = asyncHandler(async (req, res) => {
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);

  const date = req.query.date && isValidDateOnly(req.query.date)
    ? req.query.date
    : undefined;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  const summary = await getUserMealSummary(userId, { date, days });

  return res.status(200).json({
    status: true,
    message: "Meal tracking fetched successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      userTier: user.userTier,
    },
    logs: summary.logs,
    macroSummary: summary.macroSummary,
    range: summary.range,
  });
});

exports.adminDeleteMealLogController = asyncHandler(async (req, res) => {
  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);

  await loadTargetUser(userId);

  const record = await getMealLogRecordById(logId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Meal log not found", 404);
  }

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
