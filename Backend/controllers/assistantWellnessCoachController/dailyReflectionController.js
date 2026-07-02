const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { readUserIdParam, loadTargetUser } = require("../healthProgressControllerHelpers");
const {
  getSettings,
  listCatalogWithSettings,
} = require("../../models/dailyReflectionModel");

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
