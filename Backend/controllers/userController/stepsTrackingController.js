const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { isValidDateOnly, todayDateOnly } = require("../../utils/dateOnly");
const {
  getUserStepsSummary,
  upsertSettings,
  syncStepRecords,
  setManualDayStepCount,
} = require("../../models/stepsTrackingModel");

function mapStepsError(err) {
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

exports.getMyStepsTrackingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
  const date = req.query.date ? String(req.query.date).trim() : todayDateOnly();
  if (req.query.date && !isValidDateOnly(date)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }

  const data = await getUserStepsSummary(userId, { date, days });
  return res.status(200).json({
    status: true,
    message: "Steps tracking fetched",
    data,
  });
});

exports.syncMyStepsTrackingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const platform = req.body?.platform;
  const source = req.body?.source;
  const records = req.body?.records;

  if (!platform) throw new AppError("platform is required", 400);
  if (!source) throw new AppError("source is required", 400);
  if (!Array.isArray(records)) throw new AppError("records must be an array", 400);

  let data;
  try {
    data = await syncStepRecords(userId, { platform, source, records });
  } catch (err) {
    mapStepsError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Steps synced",
    data,
  });
});

exports.updateMyStepsGoalController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const goalSteps = req.body?.goalSteps ?? req.body?.goal_steps;
  if (goalSteps == null || goalSteps === "") {
    throw new AppError("goalSteps is required", 400);
  }

  let settings;
  try {
    settings = await upsertSettings(userId, { goalSteps });
  } catch (err) {
    mapStepsError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Daily steps goal updated",
    data: { settings },
  });
});

exports.setMyStepsDayController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const date = resolveTargetDate(req.body, req.query);
  const stepCount = req.body?.stepCount ?? req.body?.step_count;
  if (stepCount == null || stepCount === "") {
    throw new AppError("stepCount is required", 400);
  }

  let today;
  try {
    today = await setManualDayStepCount(userId, date, stepCount);
  } catch (err) {
    mapStepsError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Daily step count updated",
    data: { today },
  });
});
