const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  readUserIdParam,
  loadTargetUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
} = require("../helpers/healthProgressControllerHelpers");
const {
  getSettings,
  upsertSettings,
  upsertSettingsFields,
  listCatalogWithSettings,
  listDayLogsForMonth,
  getDayLog,
  upsertDayLog,
} = require("../../models/dailyReflectionModel");
const {
  loadNestedConfig,
  applyUserDrfSelection,
  selectedQuestionIdsFromSections,
} = require("../../services/drfConfigService");
const {
  buildDailyReflectionSnapshot,
  computeDailyReflectionScore,
} = require("../../services/dailyReflectionScoreService");
const { todayDateOnly } = require("../../utils/dateOnly");
const { resolveStaffActor } = require("../staffAccess");
const {
  dispatchDailyReflectionBedtimeNotification,
} = require("../../services/notificationDispatchService");

const DEFAULT_BEDTIME = "22:30";

function resolveTargetMonth(query) {
  const candidate = String(query?.month || "").trim() || todayDateOnly().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(candidate)) {
    throw new AppError("month must be YYYY-MM", 400);
  }
  return candidate;
}

async function coachContext(req) {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  return { userId, user };
}

function mapSettingsError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

function parseSelectedQuestionIds(body) {
  if (Array.isArray(body?.selectedQuestionIds)) return body.selectedQuestionIds;
  if (Array.isArray(body?.questionIds)) return body.questionIds;
  if (Array.isArray(body?.sections)) {
    return selectedQuestionIdsFromSections(body.sections);
  }
  return undefined;
}

function withTodayValues(catalog, todayLog) {
  return catalog.map((item) => ({
    ...item,
    todayValue:
      item.unit === "boolean"
        ? todayLog?.gratitudeYes === true
          ? 1
          : 0
        : Number(todayLog?.activityValues?.[item.key] ?? 0),
  }));
}

async function loadDrfBundle() {
  try {
    return await loadNestedConfig();
  } catch (err) {
    console.error("DRF config load failed:", err?.message || err);
    return { sections: [], scoring: null };
  }
}

async function buildUserDrfForm(userId, settings) {
  const date = todayDateOnly();
  const [bundle, snapshot, todayLog] = await Promise.all([
    loadDrfBundle(),
    buildDailyReflectionSnapshot(userId, date),
    getDayLog(userId, date),
  ]);
  const sections = applyUserDrfSelection(bundle.sections || [], settings.selectedQuestionIds, {
    saved: Array.isArray(settings.selectedQuestionIds),
  });
  const selectedQuestionIds = selectedQuestionIdsFromSections(sections);
  return {
    date,
    sections,
    selectedQuestionIds,
    activities: withTodayValues(listCatalogWithSettings(settings), todayLog),
    tracking: snapshot.tracking,
    bedtime: settings.bedtime || DEFAULT_BEDTIME,
    scoring: bundle.scoring,
    todayLog: todayLog || null,
    todayScore: todayLog?.submittedAt
      ? {
          date: todayLog.date,
          score: Number(todayLog.score || 0),
          maxScore: 100,
        }
      : null,
  };
}

exports.getCoachUserDailyReflectionSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const settings = await getSettings(userId);
  const form = await buildUserDrfForm(userId, settings);

  return res.status(200).json({
    status: true,
    message: "Daily reflection settings fetched",
    ...form,
    storedSettings: settings.activities,
    updatedAt: settings.updatedAt,
  });
});

exports.getCoachUserDailyReflectionHistoryController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
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

exports.updateCoachUserDailyReflectionSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const activities = req.body?.activities;
  const selectedQuestionIds = parseSelectedQuestionIds(req.body);
  const bedtime = req.body?.bedtime;

  if (
    activities === undefined &&
    selectedQuestionIds === undefined &&
    bedtime === undefined
  ) {
    throw new AppError("activities, selectedQuestionIds, or bedtime is required", 400);
  }

  if (activities !== undefined && (activities === null || typeof activities !== "object")) {
    throw new AppError("activities object is required", 400);
  }

  let updated;
  try {
    if (selectedQuestionIds !== undefined || bedtime !== undefined) {
      const current = await getSettings(userId);
      const bundle = await loadDrfBundle();
      const nextIds = selectedQuestionIds !== undefined
        ? selectedQuestionIds
        : current.selectedQuestionIds;
      const sections = applyUserDrfSelection(bundle.sections || [], nextIds, {
        saved: true,
      });
      updated = await upsertSettingsFields(userId, {
        ...(activities !== undefined ? { activities } : {}),
        selectedQuestionIds: selectedQuestionIdsFromSections(sections),
        bedtime: bedtime !== undefined ? bedtime : current.bedtime || DEFAULT_BEDTIME,
      });
    } else {
      updated = await upsertSettings(userId, activities);
    }
  } catch (err) {
    mapSettingsError(err);
  }

  const form = await buildUserDrfForm(userId, updated);

  return res.status(200).json({
    status: true,
    message: "Daily reflection settings updated",
    ...form,
    storedSettings: updated.activities,
    updatedAt: updated.updatedAt,
  });
});

exports.submitCoachUserDailyReflectionController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const date = String(req.body?.date || "").trim() || todayDateOnly();
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
    honestConfirmed: true,
    breakdown: result.breakdown,
    score: result.score,
    submittedAt: new Date().toISOString(),
  });

  const settings = await getSettings(userId);
  const form = await buildUserDrfForm(userId, settings);

  return res.status(200).json({
    status: true,
    message: "Daily reflection score saved",
    score: result.score,
    breakdown: result.breakdown,
    dayLog,
    ...form,
    storedSettings: settings.activities,
    updatedAt: settings.updatedAt,
  });
});

exports.pushCoachUserDailyReflectionBedtimeController = asyncHandler(async (req, res) => {
  const { userId, user } = await coachContext(req);
  const settings = await getSettings(userId);
  const bedtime = settings.bedtime || DEFAULT_BEDTIME;
  const actor = resolveStaffActor(req);

  const notification = await dispatchDailyReflectionBedtimeNotification({
    userId,
    bedtime,
    clientName: user?.name,
    coachName: actor.displayName,
    actorUserId: actor.id,
  });

  return res.status(200).json({
    status: true,
    message: "Bedtime reminder pushed to the app",
    bedtime,
    notificationId: notification?.id || null,
  });
});
