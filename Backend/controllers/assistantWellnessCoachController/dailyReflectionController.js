const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { readUserIdParam, loadTargetUser } = require("../healthProgressControllerHelpers");
const {
  getSettings,
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

async function assistantContext(req) {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Daily reflection is only available for Heal users", 400);
  }
  return { userId, user };
}

exports.getAssistantUserDailyReflectionSettingsController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const settings = await getSettings(userId);

  return res.status(200).json({
    status: true,
    message: "Daily reflection settings fetched",
    activities: listCatalogWithSettings(settings),
    storedSettings: settings.activities,
    updatedAt: settings.updatedAt,
  });
});

exports.getAssistantUserDailyReflectionHistoryController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
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
