const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertHealTierUser,
} = require("../healthProgressControllerHelpers");
const {
  getSettings,
  upsertSettings,
  listCatalogWithSettings,
  listDayLogsForMonth,
} = require("../../models/dailyReflectionModel");
const { todayDateOnly } = require("../../utils/dateOnly");

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
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);
  return { userId, user };
}

function mapSettingsError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

exports.getCoachUserDailyReflectionSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const settings = await getSettings(userId);

  return res.status(200).json({
    status: true,
    message: "Daily reflection settings fetched",
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
  if (!activities || typeof activities !== "object") {
    throw new AppError("activities object is required", 400);
  }

  let updated;
  try {
    updated = await upsertSettings(userId, activities);
  } catch (err) {
    mapSettingsError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Daily reflection settings updated",
    activities: listCatalogWithSettings(updated),
    storedSettings: updated.activities,
    updatedAt: updated.updatedAt,
  });
});
