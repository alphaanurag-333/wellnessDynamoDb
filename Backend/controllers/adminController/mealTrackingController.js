const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  createMealLog,
  updateMealLog,
  deleteMealLog,
  getUserMealSummary,
  getMealLogRecordById,
} = require("../../models/mealTrackingModel");
const {
  readUserIdParam,
  readLogIdParam,
  parseMealLogBody,
  loadTargetUser,
  assertHealTierUser,
  loadMealLogForUser,
  handleValidationError,
  uploadMealPhoto,
  resolveCoachIdForUser,
} = require("../helpers/mealTrackingControllerHelpers");
const { assertStaffCanAccessUser } = require("../staffAccess");
const { isValidDateOnly } = require("../../utils/dateOnly");
const {
  updateUser,
  toPublicUser,
  normalizeMealTrackingMode,
  normalizeDailyMealGoal,
  getDailyMealGoal,
} = require("../../models/userModel");
const { analyzeMealPhoto, analyzeMealItems } = require("../../services/mealPhotoAiService");
const { ZERO_MACROS, mealAiRoute } = require("../../utils/mealPhotoAi");

exports.adminGetUserMealTrackingController = asyncHandler(async (req, res) => {
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);

  const date = req.query.date && isValidDateOnly(req.query.date)
    ? req.query.date
    : undefined;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  const summary = await getUserMealSummary(userId, { date, days });

  return res.status(200).json({
    status: true,
    message: "Meal tracking fetched successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      userTier: user.userTier,
    },
    logs: summary.logs,
    macroSummary: summary.macroSummary,
    range: summary.range,
  });
});

exports.adminDeleteMealLogController = asyncHandler(async (req, res) => {
  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);

  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);

  const record = await getMealLogRecordById(logId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Meal log not found", 404);
  }

  try {
    await deleteMealLog(logId);
  } catch (err) {
    if (
      err?.name === "ConditionalCheckFailedException" ||
      err?.name === "NotFoundError"
    ) {
      throw new AppError("Meal log not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Meal log deleted successfully",
  });
});

exports.listCoachUserMealTrackingController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const date = req.query.date && isValidDateOnly(req.query.date)
    ? req.query.date
    : undefined;
  const days = Math.min(Math.max(Number(req.query.days) || 7, 1), 90);

  const summary = await getUserMealSummary(userId, { date, days });

  return res.status(200).json({
    status: true,
    message: "Meal tracking fetched successfully",
    logs: summary.logs,
    macroSummary: summary.macroSummary,
    range: summary.range,
    mealTrackingMode: user.mealTrackingMode || "macro",
    dailyMealGoal: getDailyMealGoal(user),
  });
});

exports.createCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const photoKey = await uploadMealPhoto(req);
  const payload = parseMealLogBody(req.body);

  let mealLog;
  try {
    mealLog = await createMealLog({
      userId,
      coachId: resolveCoachIdForUser(user),
      ...payload,
      ...(photoKey !== undefined ? { photoKey } : {}),
      loggedByRole: "wellness_coach",
      loggedById: actingCoachId,
      trackingMode: req.body?.trackingMode,
      userMealTrackingMode: user?.mealTrackingMode,
      assignedCoachId: actingCoachId,
      assignedCoachType: "wellness_coach",
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Meal log created successfully",
    mealLog,
  });
});

exports.updateCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadMealLogForUser(logId, userId);

  const photoKey = await uploadMealPhoto(req);
  const payload = parseMealLogBody(req.body);

  let updated;
  try {
    updated = await updateMealLog(logId, {
      ...payload,
      ...(photoKey !== undefined ? { photoKey } : {}),
    });
  } catch (err) {
    if (
      err?.name === "ConditionalCheckFailedException" ||
      err?.name === "NotFoundError"
    ) {
      throw new AppError("Meal log not found", 404);
    }
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Meal log updated successfully",
    mealLog: updated,
  });
});

exports.deleteCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  await loadMealLogForUser(logId, userId);

  try {
    await deleteMealLog(logId);
  } catch (err) {
    if (
      err?.name === "ConditionalCheckFailedException" ||
      err?.name === "NotFoundError"
    ) {
      throw new AppError("Meal log not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Meal log deleted successfully",
  });
});

exports.updateCoachUserMealTrackingModeController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const mode = normalizeMealTrackingMode(req.body?.mealTrackingMode);
  const updated = await updateUser(userId, { mealTrackingMode: mode });

  return res.status(200).json({
    status: true,
    message: "Meal tracking mode updated successfully",
    user: toPublicUser(updated),
    mealTrackingMode: mode,
  });
});

exports.updateCoachUserDailyMealGoalController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const raw = req.body?.dailyMealGoal;
  if (raw == null || raw === "") {
    throw new AppError("dailyMealGoal is required", 400);
  }
  const goal = normalizeDailyMealGoal(raw, null);
  if (![1, 2, 3].includes(goal)) {
    throw new AppError("dailyMealGoal must be 1, 2, or 3", 400);
  }

  const updated = await updateUser(userId, { dailyMealGoal: goal });

  return res.status(200).json({
    status: true,
    message: "Daily meal goal updated successfully",
    user: toPublicUser(updated),
    dailyMealGoal: goal,
  });
});

function detailedFoodListMessage(items) {
  const names = items.map((item) => item.name).filter(Boolean);
  const list = names.length > 4
    ? `${names.slice(0, 3).join(", ")} and ${names.length - 3} more`
    : names.join(", ");
  return list
    ? `Macros calculated from the client's foods (${list}) and the quantities they entered. The photo was not used. Review and save.`
    : "Macros calculated from the food name and quantity. Review and save.";
}

exports.analyzeCoachUserMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const logId = readLogIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);

  const record = await getMealLogRecordById(logId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Meal log not found", 404);
  }
  const route = mealAiRoute(record);
  const fromFoodList = route.source === "items";
  if (fromFoodList && !route.items.length) {
    throw new AppError(
      "This Detailed meal has no foods and quantities to calculate. The meal photo is not used for Detailed meals.",
      422
    );
  }
  if (!fromFoodList && !record.photoKey) {
    throw new AppError("This meal has no photo to analyse", 422);
  }

  let analysis;
  try {
    analysis = fromFoodList
      ? await analyzeMealItems({ items: route.items })
      : await analyzeMealPhoto({
        fileKey: record.photoKey,
        category: record.category,
        mealType: record.mealType,
        description: record.description,
      });
  } catch (err) {
    await updateMealLog(logId, {
      aiStatus: "failed",
      aiError: err?.message || "AI analysis failed",
      aiAnalysedAt: new Date().toISOString(),
      aiAnalysedById: actingCoachId,
    }).catch(() => {});
    if (err instanceof AppError) throw err;
    throw new AppError(err?.message || "AI analysis failed", 502);
  }

  const declined = analysis.related === false;
  const mealLog = await updateMealLog(logId, {
    proteinGm: declined ? ZERO_MACROS.proteinGm : analysis.proteinGm,
    fatsGm: declined ? ZERO_MACROS.fatsGm : analysis.fatsGm,
    carbsGm: declined ? ZERO_MACROS.carbsGm : analysis.carbsGm,
    caloriesKcal: declined ? ZERO_MACROS.caloriesKcal : analysis.caloriesKcal,
    items: declined ? [] : analysis.items,
    description: declined ? record.description : (record.description || analysis.description || null),
    rejectionReason: declined ? analysis.message : null,
    aiStatus: declined ? "declined" : "analysed",
    aiError: declined ? analysis.message : null,
    aiAnalysedAt: new Date().toISOString(),
    aiAnalysedById: actingCoachId,
    aiSource: fromFoodList ? "items" : "photo",
    ...(fromFoodList ? { trackingMode: "detailed_macro" } : {}),
  });

  return res.status(200).json({
    status: true,
    related: analysis.related,
    message: declined
      ? analysis.message
      : fromFoodList
        ? detailedFoodListMessage(route.items)
        : "Meal photo analysed. Review the macros and save.",
    mealLog,
  });
});
