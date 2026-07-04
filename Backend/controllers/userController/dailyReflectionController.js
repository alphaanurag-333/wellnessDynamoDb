const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { isValidDateOnly, todayDateOnly, addDaysDateOnly } = require("../../utils/dateOnly");
const {
  getSettings,
  getDayLog,
  upsertDayLog,
  listDayLogsBetween,
  listDayLogsForMonth,
  listEnabledActivities,
} = require("../../models/dailyReflectionModel");
const { listAssignedMentalWellbeingByUserId } = require("../../models/assignedMentalWellbeingModel");
const { buildDailyReflectionSnapshot } = require("../../services/dailyReflectionScoreService");
const { computeDailyReflectionScore } = require("../../services/dailyReflectionScoreService");
const {
  buildScorePresentation,
  buildDailyReflectionAnalytics,
  isValidAnalyticsRange,
} = require("../../services/dailyReflectionScorePresentation");

function resolveTargetDate(query, body) {
  const candidate = body?.date ?? query?.date ?? todayDateOnly();
  if (!isValidDateOnly(candidate)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
  }
  return candidate;
}

function resolveTargetMonth(query) {
  const candidate = String(query?.month || "").trim() || todayDateOnly().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(candidate)) {
    throw new AppError("month must be YYYY-MM", 400);
  }
  return candidate;
}

function pickAssignedAudio(assignments) {
  const audioAssignment = (assignments || []).find(
    (row) => String(row?.mentalWellbeing?.type || "").toLowerCase() === "audio"
  );
  if (!audioAssignment?.mentalWellbeing) return null;
  const item = audioAssignment.mentalWellbeing;
  return {
    id: audioAssignment.id || audioAssignment._id,
    title: item.title,
    type: item.type,
    link: item.link || item.file || "",
  };
}

exports.getMyDailyReflectionController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const date = resolveTargetDate(req.query, req.body);
  const [snapshot, todayLog, assignments] = await Promise.all([
    buildDailyReflectionSnapshot(userId, date),
    getDayLog(userId, date),
    listAssignedMentalWellbeingByUserId(userId),
  ]);

  return res.status(200).json({
    status: true,
    message: "Daily reflection fetched",
    date,
    activities: snapshot.enabledActivities,
    tracking: snapshot.tracking,
    todayLog,
    assignedAudio: pickAssignedAudio(assignments),
  });
});

exports.submitMyDailyReflectionController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const date = resolveTargetDate(req.query, req.body);
  const honestConfirmed = req.body?.honestConfirmed === true;
  if (!honestConfirmed) {
    throw new AppError("Please confirm you are honest to yourself", 400);
  }

  const activityValues = req.body?.activityValues || {};
  const gratitudeYes = req.body?.gratitudeYes === true;

  let result;
  try {
    result = await computeDailyReflectionScore(userId, date, {
      activityValues,
      gratitudeYes,
    });
  } catch (err) {
    if (err?.name === "ValidationError") throw new AppError(err.message, 400);
    throw err;
  }

  const dayLog = await upsertDayLog(userId, date, {
    activityValues,
    gratitudeYes,
    honestConfirmed,
    breakdown: result.breakdown,
    score: result.score,
    submittedAt: new Date().toISOString(),
  });

  return res.status(200).json({
    status: true,
    message: "Daily reflection submitted successfully",
    score: result.score,
    breakdown: result.breakdown,
    dayLog,
  });
});

exports.recordPluggedHeadphonesController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const date = resolveTargetDate(req.query, req.body);
  const pluggedHeadphones = req.body?.pluggedHeadphones === true;
  const existing = await getDayLog(userId, date);
  if (!existing?.submittedAt) {
    throw new AppError("Submit your daily reflection first", 400);
  }

  const dayLog = await upsertDayLog(userId, date, {
    ...existing,
    activityValues: existing.activityValues,
    gratitudeYes: existing.gratitudeYes,
    honestConfirmed: existing.honestConfirmed,
    breakdown: existing.breakdown,
    score: existing.score,
    pluggedHeadphones,
    submittedAt: existing.submittedAt,
  });

  return res.status(200).json({
    status: true,
    message: "Headphone preference recorded",
    dayLog,
  });
});

exports.getMyDailyReflectionHistoryController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const month = resolveTargetMonth(req.query);
  const logs = await listDayLogsForMonth(userId, month);

  const history = logs
    .filter((row) => row.submittedAt)
    .map((row) => ({ date: row.date, score: row.score }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return res.status(200).json({
    status: true,
    message: "Daily reflection history fetched",
    month,
    history,
  });
});

exports.getMyDailyReflectionScoreController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const today = todayDateOnly();
  const todayLog = await getDayLog(userId, today);
  if (todayLog?.submittedAt) {
    return res.status(200).json({
      status: true,
      message: "Daily reflection score fetched",
      score: buildScorePresentation(todayLog.score, {
        date: todayLog.date,
        isToday: true,
        submittedToday: true,
      }),
    });
  }

  const endDate = today;
  const startDate = addDaysDateOnly(endDate, -29);
  const logs = await listDayLogsBetween(userId, startDate, endDate);
  const latest = logs
    .filter((row) => row.submittedAt)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))[0] || null;

  return res.status(200).json({
    status: true,
    message: "Daily reflection score fetched",
    score: latest
      ? buildScorePresentation(latest.score, {
          date: latest.date,
          isToday: latest.date === today,
          submittedToday: false,
        })
      : null,
  });
});

exports.getMyDailyReflectionAnalyticsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const range = String(req.query?.range || "last-6-months").trim().toLowerCase();
  if (!isValidAnalyticsRange(range)) {
    throw new AppError("range must be one of: last-6-months, last-4-weeks, month-to-date", 400);
  }

  let month;
  if (range === "month-to-date") {
    month = String(req.query?.month || "").trim() || todayDateOnly().slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(month)) {
      throw new AppError("month must be YYYY-MM", 400);
    }
  }

  const analytics = await buildDailyReflectionAnalytics(userId, range, { month });

  return res.status(200).json({
    status: true,
    message: "Daily reflection analytics fetched",
    ...analytics,
  });
});
