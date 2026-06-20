const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { isValidDateOnly, todayDateOnly } = require("../../utils/dateOnly");
const {
  getUserWaterSummary,
  setDayGoal,
  adjustDayGlassCount,
  setDayGlassCount,
  getSettings,
} = require("../../models/waterTrackingModel");

function mapWaterError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

function resolveTargetDate(body, query) {
  const candidate = body?.date ?? query?.date ?? todayDateOnly();
  if (!isValidDateOnly(candidate)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }
  return candidate;
}

exports.getMyWaterTrackingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
  const date = req.query.date ? String(req.query.date).trim() : todayDateOnly();
  if (req.query.date && !isValidDateOnly(date)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }

  const data = await getUserWaterSummary(userId, { date, days });
  return res.status(200).json({
    status: true,
    message: "Water tracking fetched",
    data,
  });
});

exports.updateMyWaterGoalController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const goalGlasses = req.body?.goalGlasses ?? req.body?.goal_glasses;
  if (goalGlasses == null || goalGlasses === "") {
    throw new AppError("goalGlasses is required", 400);
  }
  const date = resolveTargetDate(req.body, req.query);

  let result;
  try {
    result = await setDayGoal(userId, date, goalGlasses);
  } catch (err) {
    mapWaterError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Daily water goal updated",
    data: result,
  });
});

exports.incrementMyWaterController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const date = resolveTargetDate(req.body, req.query);
  const settings = await getSettings(userId);

  let today;
  try {
    today = await adjustDayGlassCount(userId, date, 1, settings);
  } catch (err) {
    mapWaterError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Glass added",
    data: { today },
  });
});

exports.decrementMyWaterController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const date = resolveTargetDate(req.body, req.query);
  const settings = await getSettings(userId);

  let today;
  try {
    today = await adjustDayGlassCount(userId, date, -1, settings);
  } catch (err) {
    mapWaterError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Glass removed",
    data: { today },
  });
});

exports.setMyWaterDayController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const date = resolveTargetDate(req.body, req.query);
  const glassCount = req.body?.glassCount ?? req.body?.glass_count;
  if (glassCount == null || glassCount === "") {
    throw new AppError("glassCount is required", 400);
  }

  const settings = await getSettings(userId);
  let today;
  try {
    today = await setDayGlassCount(userId, date, glassCount, settings);
  } catch (err) {
    mapWaterError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Daily water count updated",
    data: { today },
  });
});
