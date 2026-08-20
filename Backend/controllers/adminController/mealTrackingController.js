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
const { updateUser, toPublicUser, normalizeMealTrackingMode } = require("../../models/userModel");
const { analyzeMealPhoto } = require("../../services/mealPhotoAiService");
const { ZERO_MACROS } = require("../../utils/mealPhotoAi");

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
  if (!record.photoKey) {
    throw new AppError("This meal has no photo to analyse", 422);
  }

  let analysis;
  try {
    analysis = await analyzeMealPhoto({
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
    description: declined ? record.description : (analysis.description ?? record.description),
    rejectionReason: declined ? analysis.message : null,
    aiStatus: declined ? "declined" : "analysed",
    aiError: declined ? analysis.message : null,
    aiAnalysedAt: new Date().toISOString(),
    aiAnalysedById: actingCoachId,
  });

  return res.status(200).json({
    status: true,
    related: analysis.related,
    message: declined
      ? analysis.message
      : "Meal photo analysed. Review the macros and save.",
    mealLog,
  });
});
