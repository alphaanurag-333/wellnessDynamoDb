const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  readUserIdParam,
  readPagination,
  resolveHealthProgressSettings,
  loadTargetUser,
  isFemaleUser,
} = require("../healthProgressControllerHelpers");
const {
  listWeightLogsByUser,
  toPublicWeightLog,
} = require("../../models/healthProgressWeightModel");
const {
  listGlucoseLogsByUser,
  toPublicGlucoseLog,
} = require("../../models/healthProgressGlucoseModel");
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

async function assistantContext(req) {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Health progress is only available for Heal users", 400);
  }
  return { userId, user };
}

exports.getAssistantHealthProgressSettingsController = asyncHandler(async (req, res) => {
  const { user } = await assistantContext(req);
  return res.status(200).json({
    status: true,
    message: "Health progress settings fetched",
    settings: resolveHealthProgressSettings(user),
    storedSettings: user.healthProgressFeatures || {},
    gender: user.gender,
    isFemale: isFemaleUser(user),
  });
});

exports.listAssistantWeightLogsController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const { page, limit } = readPagination(req);
  const result = await listWeightLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Weight history fetched",
    logs: result.items.map(toPublicWeightLog),
    pagination: result.pagination,
  });
});

exports.listAssistantGlucoseLogsController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const { page, limit } = readPagination(req);
  const result = await listGlucoseLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Glucose history fetched",
    logs: result.items.map(toPublicGlucoseLog),
    pagination: result.pagination,
  });
});

exports.listAssistantBloodPressureLogsController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const { page, limit } = readPagination(req);
  const result = await listBloodPressureLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Blood pressure history fetched",
    logs: result.items.map(toPublicBloodPressureLog),
    pagination: result.pagination,
  });
});

exports.listAssistantMenstrualCycleLogsController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const { page, limit } = readPagination(req);
  const result = await listMenstrualCycleLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Menstrual cycle history fetched",
    logs: result.items.map(toPublicMenstrualCycleLog),
    pagination: result.pagination,
  });
});

exports.listAssistantConditionLogsController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const { page, limit } = readPagination(req);
  const result = await listConditionLogsByUser(userId, { page, limit });
  return res.status(200).json({
    status: true,
    message: "Condition comparison history fetched",
    logs: result.items.map(toPublicConditionLog),
    pagination: result.pagination,
  });
});
