const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  authedUserId,
  readPagination,
  handleValidationError,
  parseRecordedAt,
  resolveHealthProgressSettings,
  toNumberOrNull,
  normalizeGlucoseType,
  normalizeBodyPart,
  toIsoDateOnly,
} = require("../healthProgressControllerHelpers");
const {
  createWeightLog,
  listWeightLogsByUser,
  toPublicWeightLog,
} = require("../../models/healthProgressWeightModel");
const {
  createGlucoseLog,
  listGlucoseLogsByUser,
  toPublicGlucoseLog,
} = require("../../models/healthProgressGlucoseModel");
const {
  createBloodPressureLog,
  listBloodPressureLogsByUser,
  toPublicBloodPressureLog,
} = require("../../models/healthProgressBloodPressureModel");
const {
  createMenstrualCycleLog,
  listMenstrualCycleLogsByUser,
  toPublicMenstrualCycleLog,
} = require("../../models/healthProgressMenstrualCycleModel");
const {
  createConditionLog,
  listConditionLogsByUser,
  toPublicConditionLog,
} = require("../../models/healthProgressConditionModel");

exports.getHealthProgressSettingsController = asyncHandler(async (req, res) => {
  const user = req.currentUser;
  const settings = resolveHealthProgressSettings(user);

  return res.status(200).json({
    status: true,
    message: "Health progress settings fetched",
    data: {
      settings,
      gender: user.gender,
    },
  });
});

exports.createWeightLogController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};
  const weightKg = toNumberOrNull(body.weightKg ?? body.weight_kg);
  if (weightKg == null) throw new AppError("weightKg is required", 400);

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
      recordedAt: parseRecordedAt(body),
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Weight entry saved",
    data: { log: toPublicWeightLog(log) },
  });
});

exports.listWeightLogsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const { page, limit } = readPagination(req);
  const result = await listWeightLogsByUser(userId, { page, limit });

  return res.status(200).json({
    status: true,
    message: "Weight history fetched",
    data: {
      logs: result.items.map(toPublicWeightLog),
      pagination: result.pagination,
    },
  });
});

exports.createGlucoseLogController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};
  const value = toNumberOrNull(body.value);
  if (value == null) throw new AppError("value is required", 400);

  let type;
  try {
    type = normalizeGlucoseType(body.type);
  } catch (err) {
    handleValidationError(err);
  }

  const glucosePicKey = await uploadFileFromRequest(
    req,
    "users/health-progress/glucose"
  );

  let log;
  try {
    log = await createGlucoseLog({
      userId,
      type,
      value,
      glucosePicKey: glucosePicKey || null,
      recordedAt: parseRecordedAt(body),
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Glucose entry saved",
    data: { log: toPublicGlucoseLog(log) },
  });
});

exports.listGlucoseLogsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const { page, limit } = readPagination(req);
  const result = await listGlucoseLogsByUser(userId, { page, limit });

  return res.status(200).json({
    status: true,
    message: "Glucose history fetched",
    data: {
      logs: result.items.map(toPublicGlucoseLog),
      pagination: result.pagination,
    },
  });
});

exports.createBloodPressureLogController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};
  const sys = toNumberOrNull(body.sys);
  const dia = toNumberOrNull(body.dia);
  if (sys == null || dia == null) {
    throw new AppError("sys and dia are required", 400);
  }

  const bpPicKey = await uploadFileFromRequest(
    req,
    "users/health-progress/blood-pressure"
  );

  let log;
  try {
    log = await createBloodPressureLog({
      userId,
      sys,
      dia,
      bpPicKey: bpPicKey || null,
      recordedAt: parseRecordedAt(body),
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Blood pressure entry saved",
    data: { log: toPublicBloodPressureLog(log) },
  });
});

exports.listBloodPressureLogsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const { page, limit } = readPagination(req);
  const result = await listBloodPressureLogsByUser(userId, { page, limit });

  return res.status(200).json({
    status: true,
    message: "Blood pressure history fetched",
    data: {
      logs: result.items.map(toPublicBloodPressureLog),
      pagination: result.pagination,
    },
  });
});

exports.createMenstrualCycleLogController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};
  const startDate = toIsoDateOnly(body.startDate ?? body.start_date);
  const endDate = toIsoDateOnly(body.endDate ?? body.end_date);
  if (!startDate || !endDate) {
    throw new AppError("startDate and endDate are required", 400);
  }

  let log;
  try {
    log = await createMenstrualCycleLog({
      userId,
      startDate,
      endDate,
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Menstrual cycle entry saved",
    data: { log: toPublicMenstrualCycleLog(log) },
  });
});

exports.listMenstrualCycleLogsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const { page, limit } = readPagination(req);
  const result = await listMenstrualCycleLogsByUser(userId, { page, limit });

  return res.status(200).json({
    status: true,
    message: "Menstrual cycle history fetched",
    data: {
      logs: result.items.map(toPublicMenstrualCycleLog),
      pagination: result.pagination,
    },
  });
});

exports.createConditionLogController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const body = req.body || {};

  let bodyPart;
  try {
    bodyPart = normalizeBodyPart(body.bodyPart ?? body.body_part);
  } catch (err) {
    handleValidationError(err);
  }

  const picKey = await uploadFileFromRequest(
    req,
    "users/health-progress/condition-comparison"
  );
  if (!picKey) throw new AppError("condition_pic is required", 400);

  let log;
  try {
    log = await createConditionLog({
      userId,
      bodyPart,
      bodyPartOther: body.bodyPartOther ?? body.body_part_other,
      picKey,
      date: body.date,
      recordedAt: parseRecordedAt(body),
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Condition comparison entry saved",
    data: { log: toPublicConditionLog(log) },
  });
});

exports.listConditionLogsController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const { page, limit } = readPagination(req);
  const result = await listConditionLogsByUser(userId, { page, limit });

  return res.status(200).json({
    status: true,
    message: "Condition comparison history fetched",
    data: {
      logs: result.items.map(toPublicConditionLog),
      pagination: result.pagination,
    },
  });
});
