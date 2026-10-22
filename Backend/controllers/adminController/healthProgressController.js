const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  readUserIdParam,
  readPagination,
  parseCoachSettingsUpdate,
  parseRecordedAt,
  handleValidationError,
  resolveHealthProgressSettings,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertStaffCanAccessUser,
  assertHealTierUser,
  updateUser,
  toPublicUser,
  isFemaleUser,
  parseHealthWeightKg,
} = require("../helpers/healthProgressControllerHelpers");
const {
  createWeightLog,
  listWeightLogsByUser,
  clearWeightLogPhoto,
  reviewWeightLogPhoto,
  toPublicWeightLog,
} = require("../../models/healthProgressWeightModel");
const {
  listGlucoseLogsByUser,
  toPublicGlucoseLog,
} = require("../../models/healthProgressGlucoseModel");
const { listUserLabReportsByUserId } = require("../../models/userLabReportModel");
const { listHba1cReadingsFromLabReports } = require("../../utils/programProgressCalculations");
const {
  listBloodPressureLogsByUser,
  toPublicBloodPressureLog,
} = require("../../models/healthProgressBloodPressureModel");
const {
  listMenstrualCycleLogsByUser,
  toPublicMenstrualCycleLog,
} = require("../../models/healthProgressMenstrualCycleModel");
const {
  listConditionLogsByUser,
  toPublicConditionLog,
} = require("../../models/healthProgressConditionModel");
const {
  ensurePurchasedProgramTrackers,
  withPurchasedProgramTrackers,
} = require("../../services/healthProgressProgramTrackerService");
const {
  clientUploadWindows,
  syncClientUploadWindow,
  assertCoachCanOpenClientUpload,
  openClientUploadForCoach,
  closeClientUploadForCoach,
} = require("../../services/healthProgressClientUploadService");

async function coachContext(req) {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);
  assertHealTierUser(user);
  return { userId, user };
}

exports.getCoachHealthProgressSettingsController = asyncHandler(async (req, res) => {
  const { user } = await coachContext(req);
  const tracked = await ensurePurchasedProgramTrackers(user);
  const synced = await syncClientUploadWindow(tracked);
  const stored = resolveHealthProgressSettings(synced);

  return res.status(200).json({
    status: true,
    message: "Health progress settings fetched",
    settings: stored,
    storedSettings: synced.healthProgressFeatures || {},
    clientUpload: clientUploadWindows(synced.healthProgressClientUpload).windows,
    gender: synced.gender,
    isFemale: isFemaleUser(synced),
  });
});

exports.updateCoachHealthProgressSettingsController = asyncHandler(async (req, res) => {
  const { userId, user } = await coachContext(req);
  const body = req.body || {};
  let updated = user;

  const uploadEntries = Object.entries(body.clientUpload || {}).filter(
    ([, value]) => value === true || value === false,
  );
  if (uploadEntries.length) {
    assertCoachCanOpenClientUpload(req);
    for (const [featureKey, shouldOpen] of uploadEntries) {
      updated = shouldOpen === true
        ? await openClientUploadForCoach(updated, featureKey)
        : await closeClientUploadForCoach(updated, featureKey);
    }
  }

  if (body.healthProgressFeatures || !uploadEntries.length) {
    const requested = parseCoachSettingsUpdate(body, updated);
    const nextFeatures = await withPurchasedProgramTrackers(updated, requested);
    updated = await updateUser(userId, { healthProgressFeatures: nextFeatures });
  }

  const uploadMessage = uploadEntries.length
    ? uploadEntries.every(([, value]) => value === false)
      ? "Client update closed"
      : uploadEntries.every(([, value]) => value === true)
        ? "Client update opened"
        : "Client update settings updated"
    : "Health progress settings updated";

  return res.status(200).json({
    status: true,
    message: uploadEntries.length ? uploadMessage : "Health progress settings updated",
    settings: resolveHealthProgressSettings(updated),
    storedSettings: updated.healthProgressFeatures,
    clientUpload: clientUploadWindows(updated.healthProgressClientUpload).windows,
    user: toPublicUser(updated),
  });
});

exports.listCoachWeightLogsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const { page, limit } = readPagination(req);
  const result = await listWeightLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Weight history fetched",
    logs: result.items.map(toPublicWeightLog),
    pagination: result.pagination,
  });
});

exports.createCoachWeightLogController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const body = req.body || {};
  let weightKg;
  let recordedAt;
  try {
    recordedAt = parseRecordedAt(body);
    weightKg = parseHealthWeightKg(
      body.weightKg ?? body.weight_kg ?? body.weight,
      body.unit || body.weightUnit
    );
  } catch (err) {
    handleValidationError(err);
  }
  if (weightKg == null) throw new AppError("weight is required", 400);

  const weightPicKey = await uploadFileFromRequest(
    req,
    "users/health-progress/weight"
  );

  let log;
  try {
    log = await createWeightLog({
      userId,
      weightKg,
      weightPicKey: weightPicKey || null,
      recordedAt,
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Weight entry saved",
    log: toPublicWeightLog(log),
  });
});

exports.deleteCoachWeightPhotoController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const logId = String(req.params.logId || "").trim();
  if (!logId) throw new AppError("logId is required", 400);

  let log;
  try {
    log = await clearWeightLogPhoto(userId, logId);
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Weight photo deleted",
    log: toPublicWeightLog(log),
  });
});

exports.reviewCoachWeightPhotoController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const logId = String(req.params.logId || "").trim();
  const action = String(req.body?.action || req.body?.status || "").trim();
  if (!logId) throw new AppError("logId is required", 400);
  if (action !== "approved" && action !== "rejected") {
    throw new AppError("action must be approved or rejected", 400);
  }

  let log;
  try {
    log = await reviewWeightLogPhoto(userId, logId, {
      status: action,
      reviewedById: req.auth?.sub,
      rejectionReason: req.body?.rejectionReason,
    });
  } catch (err) {
    if (err?.name === "NotFoundError") throw new AppError(err.message, 404);
    handleValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Weight photo accepted" : "Weight photo rejected",
    log: toPublicWeightLog(log),
  });
});

exports.listCoachGlucoseLogsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const { page, limit } = readPagination(req);
  const [result, labReports] = await Promise.all([
    listGlucoseLogsByUser(userId, { page, limit }),
    listUserLabReportsByUserId(userId),
  ]);
  const hba1cReadings = listHba1cReadingsFromLabReports(labReports);
  return res.status(200).json({
    status: true,
    message: "Glucose history fetched",
    logs: result.items.map(toPublicGlucoseLog),
    pagination: result.pagination,
    hba1cReadings,
  });
});

exports.listCoachBloodPressureLogsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const { page, limit } = readPagination(req);
  const result = await listBloodPressureLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Blood pressure history fetched",
    logs: result.items.map(toPublicBloodPressureLog),
    pagination: result.pagination,
  });
});

exports.listCoachMenstrualCycleLogsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const { page, limit } = readPagination(req);
  const result = await listMenstrualCycleLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Menstrual cycle history fetched",
    logs: result.items.map(toPublicMenstrualCycleLog),
    pagination: result.pagination,
  });
});

exports.listCoachConditionLogsController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const { page, limit } = readPagination(req);
  const result = await listConditionLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Condition comparison history fetched",
    logs: result.items.map(toPublicConditionLog),
    pagination: result.pagination,
  });
});
