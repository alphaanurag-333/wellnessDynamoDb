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
} = require("../../models/dailyReflectionModel");
const {
  loadNestedConfig,
  applyUserDrfSelection,
  selectedQuestionIdsFromSections,
} = require("../../services/drfConfigService");
const { todayDateOnly } = require("../../utils/dateOnly");

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

async function buildUserDrfForm(userId, settings) {
  const [bundle, todayLog] = await Promise.all([
    loadNestedConfig(),
    getDayLog(userId, todayDateOnly()),
  ]);
  const sections = applyUserDrfSelection(bundle.sections, settings.selectedQuestionIds, {
    saved: Array.isArray(settings.selectedQuestionIds),
  });
  const selectedQuestionIds = selectedQuestionIdsFromSections(sections);
  return {
    sections,
    selectedQuestionIds,
    bedtime: settings.bedtime || DEFAULT_BEDTIME,
    scoring: bundle.scoring,
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
    activities: listCatalogWithSettings(settings),
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
    throw new AppError("selectedQuestionIds or bedtime is required", 400);
  }

  if (activities !== undefined && (activities === null || typeof activities !== "object")) {
    throw new AppError("activities object is required", 400);
  }

  let updated;
  try {
    if (selectedQuestionIds !== undefined || bedtime !== undefined) {
      const current = await getSettings(userId);
      const bundle = await loadNestedConfig();
      const nextIds = selectedQuestionIds !== undefined
        ? selectedQuestionIds
        : current.selectedQuestionIds;
      const sections = applyUserDrfSelection(bundle.sections, nextIds, {
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
    activities: listCatalogWithSettings(updated),
    storedSettings: updated.activities,
    updatedAt: updated.updatedAt,
  });
});
