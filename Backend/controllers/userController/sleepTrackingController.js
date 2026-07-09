const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { isValidDateOnly, todayDateOnly } = require("../../utils/dateOnly");
const {
  getUserSleepSummary,
  syncSleepRecords,
} = require("../../models/sleepTrackingModel");

function mapSleepError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

exports.getMySleepTrackingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);
  const date = req.query.date ? String(req.query.date).trim() : todayDateOnly();
  if (req.query.date && !isValidDateOnly(date)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }

  const data = await getUserSleepSummary(userId, { date, days });
  return res.status(200).json({
    status: true,
    message: "Sleep tracking fetched",
    data,
  });
});

exports.syncMySleepTrackingController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const platform = req.body?.platform;
  const source = req.body?.source;
  const records = req.body?.records;

  if (!platform) throw new AppError("platform is required", 400);
  if (!source) throw new AppError("source is required", 400);
  if (!Array.isArray(records)) throw new AppError("records must be an array", 400);

  let data;
  try {
    data = await syncSleepRecords(userId, { platform, source, records });
  } catch (err) {
    mapSleepError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Sleep synced",
    data,
  });
});
