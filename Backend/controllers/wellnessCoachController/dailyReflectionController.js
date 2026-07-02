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
} = require("../../models/dailyReflectionModel");

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
