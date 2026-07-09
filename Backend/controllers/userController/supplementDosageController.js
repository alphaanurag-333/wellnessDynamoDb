const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listUserSupplementDosagesByUserId,
  getUserSupplementDosageRecordById,
} = require("../../models/userSupplementDosageModel");
const {
  queryLogsByDosageId,
  queryLogsByUserIdAndDate,
  computeProgressPercent,
  buildTodayCompletionMap,
  toggleUserSupplementDosageLog,
  buildLogId,
  normalizeLogDate,
  normalizePeriod,
} = require("../../models/userSupplementDosageLogModel");

const PERIOD_COLORS = {
  morning: "#F5A623",
  afternoon: "#1877F2",
  evening: "#7B61FF",
};

function handleValidationError(err) {
  if (err?.name === "ValidationError") {
    throw new AppError(err.message, 400);
  }
  throw err;
}

function formatDateRange(startDate, endDate) {
  const fmt = (iso) => {
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  };
  return `${fmt(startDate)} - ${fmt(endDate)}`;
}

function isDosageActiveOnDate(dosage, logDate) {
  if (String(dosage.status || "").toLowerCase() === "stopped") return false;
  const date = normalizeLogDate(logDate);
  return date >= dosage.startDate && date <= dosage.endDate;
}

async function hydrateDosageForUser(dosage, todayLogs, logDate) {
  const logs = await queryLogsByDosageId(dosage.id);
  const progressPercent = computeProgressPercent(dosage, logs);
  const todayCompletion = buildTodayCompletionMap(dosage, todayLogs, logDate);
  const dailyDosageLabel = `${dosage.totalPerDay} ${dosage.unit}`;

  return {
    ...dosage,
    progressPercent,
    dateRange: formatDateRange(dosage.startDate, dosage.endDate),
    dailyDosageLabel,
    todayCompletion,
    periods: (dosage.periods || []).map((row) => ({
      ...row,
      completed: todayCompletion[row.period] === true,
      color: PERIOD_COLORS[row.period] || "#F5A623",
    })),
  };
}

exports.getUserSupplementDosagesController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const logDate = normalizeLogDate(req.query?.date);
  const todayLogs = await queryLogsByUserIdAndDate(userId, logDate);
  const dosages = await listUserSupplementDosagesByUserId(userId, { includeStopped: false });
  const activeDosages = dosages.filter((row) => isDosageActiveOnDate(row, logDate));

  const hydrated = await Promise.all(
    activeDosages.map((dosage) => hydrateDosageForUser(dosage, todayLogs, logDate))
  );

  return res.status(200).json({
    status: true,
    message: "Supplement dosages fetched successfully",
    date: logDate,
    dosages: hydrated,
  });
});

exports.toggleUserSupplementDosageLogController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const dosageId = String(req.params.dosageId || "").trim();
  const period = normalizePeriod(req.body?.period);
  const logDate = normalizeLogDate(req.body?.date);

  const dosage = await getUserSupplementDosageRecordById(dosageId);
  if (!dosage || String(dosage.userId || "") !== String(userId)) {
    throw new AppError("Supplement dosage not found", 404);
  }
  if (!isDosageActiveOnDate(dosage, logDate)) {
    throw new AppError("This dosage plan is not active for the selected date", 400);
  }

  const allowedPeriods = new Set((dosage.periods || []).map((row) => row.period));
  if (!allowedPeriods.has(period)) {
    throw new AppError("Invalid period for this dosage plan", 400);
  }

  // Fetch the pre-toggle state so we can apply the known write locally below.
  // DynamoDB GSI queries are eventually consistent, so re-querying these indexes
  // immediately after the write can still return stale data.
  const logsBeforeToggle = await queryLogsByDosageId(dosageId);
  const todayLogsBeforeToggle = await queryLogsByUserIdAndDate(userId, logDate);

  let result;
  try {
    result = await toggleUserSupplementDosageLog({
      dosageId,
      userId,
      period,
      logDate,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const toggledLogId = buildLogId(dosageId, logDate, period);
  const applyToggleDelta = (logsList) => {
    const filtered = (logsList || []).filter((log) => log.id !== toggledLogId);
    if (result.completed && result.log) filtered.push(result.log);
    return filtered;
  };

  const logs = applyToggleDelta(logsBeforeToggle);
  const progressPercent = computeProgressPercent(dosage, logs);
  const todayLogs = applyToggleDelta(todayLogsBeforeToggle);
  const todayCompletion = buildTodayCompletionMap(dosage, todayLogs, logDate);

  return res.status(200).json({
    status: true,
    message: result.completed ? "Dosage logged successfully" : "Dosage log removed",
    completed: result.completed,
    log: result.log,
    progressPercent,
    todayCompletion,
  });
});
