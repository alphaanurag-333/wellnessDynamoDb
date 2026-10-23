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
  ensureBedtimeSettingsPersisted,
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
const { isValidDateOnly, todayDateOnly } = require("../../utils/dateOnly");
const { resolveStaffActor } = require("../staffAccess");
const {
  dispatchDailyReflectionBedtimeNotification,
} = require("../../services/notificationDispatchService");
const { runDailyReflectionBedtimeJob } = require("../../services/dailyReflectionBedtimeJobService");
const { parseFcmIdFromBody } = require("../../utils/parseFcmId");

const DEFAULT_BEDTIME = "22:30";

function formatBedtimePushResult(push) {
  const delivered = Boolean(push && !push.skipped && Number(push.successCount) > 0);
  const noDevice = Boolean(push?.skipped && push?.reason === "no_token");
  const fcmError = push?.primaryError || push?.errors?.[0] || null;

  let message;
  if (delivered) {
    message = "Bedtime push notification sent (phone tray, not in-app inbox)";
  } else if (noDevice) {
    message = "No FCM token — reminder saved in the app inbox as fallback only";
  } else if (fcmError?.code === "messaging/mismatched-credential") {
    message =
      "Reminder saved in the app inbox, but FCM rejected the device token (Firebase project / SenderId mismatch)";
  } else if (fcmError?.message) {
    message = `Reminder saved in the app inbox, but push delivery failed (${fcmError.message})`;
  } else {
    message = "Reminder saved in the app inbox, but push delivery failed";
  }

  return {
    delivered,
    noDevice,
    message,
    push: {
      delivered,
      skipped: Boolean(push?.skipped),
      reason: push?.reason || fcmError?.code || null,
      errorMessage: fcmError?.message || null,
      successCount: Number(push?.successCount) || 0,
      failureCount: Number(push?.failureCount) || 0,
    },
  };
}

function resolveTargetMonth(query) {
  const candidate = String(query?.month || "").trim() || todayDateOnly().slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(candidate)) {
    throw new AppError("month must be YYYY-MM", 400);
  }
  return candidate;
}

function resolveTargetDate(query, body) {
  const candidate = body?.date ?? query?.date ?? todayDateOnly();
  if (!isValidDateOnly(candidate)) {
    throw new AppError("date must be YYYY-MM-DD", 400);
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

async function buildUserDrfForm(userId, settings, date = todayDateOnly()) {
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
    dailyReflectionAudioId: settings.dailyReflectionAudioId || null,
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
  const date = resolveTargetDate(req.query, req.body);
  const settings = await getSettings(userId);
  const form = await buildUserDrfForm(userId, settings, date);

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
  const hasDailyReflectionAudioId = Object.prototype.hasOwnProperty.call(
    req.body || {},
    "dailyReflectionAudioId"
  );
  const dailyReflectionAudioId = hasDailyReflectionAudioId
    ? req.body.dailyReflectionAudioId
    : undefined;

  if (
    activities === undefined &&
    selectedQuestionIds === undefined &&
    bedtime === undefined &&
    !hasDailyReflectionAudioId
  ) {
    throw new AppError(
      "activities, selectedQuestionIds, bedtime, or dailyReflectionAudioId is required",
      400
    );
  }

  if (activities !== undefined && (activities === null || typeof activities !== "object")) {
    throw new AppError("activities object is required", 400);
  }

  let updated;
  try {
    const audioOnly =
      hasDailyReflectionAudioId &&
      activities === undefined &&
      selectedQuestionIds === undefined &&
      bedtime === undefined;

    if (audioOnly) {
      updated = await upsertSettingsFields(userId, { dailyReflectionAudioId });
    } else if (selectedQuestionIds !== undefined || bedtime !== undefined) {
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
        ...(hasDailyReflectionAudioId ? { dailyReflectionAudioId } : {}),
      });
    } else {
      updated = await upsertSettings(userId, activities);
    }
  } catch (err) {
    mapSettingsError(err);
  }

  if (bedtime !== undefined) {
    await ensureBedtimeSettingsPersisted(userId, bedtime);
  }

  const date = resolveTargetDate(req.query, req.body);
  const form = await buildUserDrfForm(userId, updated, date);

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
  const form = await buildUserDrfForm(userId, settings, date);

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
  await ensureBedtimeSettingsPersisted(userId, bedtime);
  const actor = resolveStaffActor(req);
  const fcmToken = parseFcmIdFromBody(req.body);

  const { notification, push } = await dispatchDailyReflectionBedtimeNotification({
    userId,
    bedtime,
    coachName: actor.displayName,
    actorUserId: actor.id,
    fcmToken: fcmToken || null,
  });

  const formatted = formatBedtimePushResult(push);

  return res.status(200).json({
    status: true,
    message: formatted.message,
    bedtime,
    notificationId: notification?.id || null,
    push: formatted.push,
  });
});

exports.runDailyReflectionBedtimeJobController = asyncHandler(async (req, res) => {
  const body = req.body || {};
  const query = req.query || {};
  const nowClock = body.nowClock ?? query.nowClock;
  const dateOnly = body.dateOnly ?? query.dateOnly;
  const timezone = body.timezone ?? query.timezone;

  const options = {};
  if (nowClock != null && String(nowClock).trim() !== "") {
    options.nowClock = String(nowClock).trim();
  }
  if (dateOnly != null && String(dateOnly).trim() !== "") {
    options.dateOnly = String(dateOnly).trim();
  }
  if (timezone != null && String(timezone).trim() !== "") {
    options.timezone = String(timezone).trim();
  }

  const result = await runDailyReflectionBedtimeJob(options);
  return res.status(200).json({
    status: true,
    message: `Daily reflection bedtime job completed at ${result.nowClock} (${result.timezone})`,
    ...result,
  });
});
