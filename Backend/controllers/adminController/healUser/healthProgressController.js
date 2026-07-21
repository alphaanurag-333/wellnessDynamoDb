const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  readUserIdParam,
  readPagination,
  parseCoachSettingsUpdate,
  resolveHealthProgressSettings,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
  updateUser,
  toPublicUser,
  isFemaleUser,
} = require("../../healthProgressControllerHelpers");
const {
  listWeightLogsByUser,
  toPublicWeightLog,
} = require("../../../models/healthProgressWeightModel");
const {
  listGlucoseLogsByUser,
  toPublicGlucoseLog,
} = require("../../../models/healthProgressGlucoseModel");
const {
  listBloodPressureLogsByUser,
  toPublicBloodPressureLog,
} = require("../../../models/healthProgressBloodPressureModel");
const {
  listMenstrualCycleLogsByUser,
  toPublicMenstrualCycleLog,
} = require("../../../models/healthProgressMenstrualCycleModel");
const {
  listConditionLogsByUser,
  toPublicConditionLog,
} = require("../../../models/healthProgressConditionModel");

async function adminContext(req) {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);
  return { userId, user };
}

exports.getAdminHealthProgressSettingsController = asyncHandler(async (req, res) => {
  const { user } = await adminContext(req);
  const stored = resolveHealthProgressSettings(user);

  return res.status(200).json({
    status: true,
    message: "Health progress settings fetched",
    settings: stored,
    storedSettings: user.healthProgressFeatures || {},
    gender: user.gender,
    isFemale: isFemaleUser(user),
  });
});

exports.updateAdminHealthProgressSettingsController = asyncHandler(async (req, res) => {
  const { userId, user } = await adminContext(req);
  const nextFeatures = parseCoachSettingsUpdate(req.body || {}, user);
  const updated = await updateUser(userId, { healthProgressFeatures: nextFeatures });

  return res.status(200).json({
    status: true,
    message: "Health progress settings updated",
    settings: resolveHealthProgressSettings(updated),
    storedSettings: updated.healthProgressFeatures,
    user: toPublicUser(updated),
  });
});

exports.listAdminWeightLogsController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const { page, limit } = readPagination(req);
  const result = await listWeightLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Weight history fetched",
    logs: result.items.map(toPublicWeightLog),
    pagination: result.pagination,
  });
});

exports.listAdminGlucoseLogsController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const { page, limit } = readPagination(req);
  const result = await listGlucoseLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Glucose history fetched",
    logs: result.items.map(toPublicGlucoseLog),
    pagination: result.pagination,
  });
});

exports.listAdminBloodPressureLogsController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const { page, limit } = readPagination(req);
  const result = await listBloodPressureLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Blood pressure history fetched",
    logs: result.items.map(toPublicBloodPressureLog),
    pagination: result.pagination,
  });
});

exports.listAdminMenstrualCycleLogsController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const { page, limit } = readPagination(req);
  const result = await listMenstrualCycleLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Menstrual cycle history fetched",
    logs: result.items.map(toPublicMenstrualCycleLog),
    pagination: result.pagination,
  });
});

exports.listAdminConditionLogsController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const { page, limit } = readPagination(req);
  const result = await listConditionLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Condition comparison history fetched",
    logs: result.items.map(toPublicConditionLog),
    pagination: result.pagination,
  });
});
