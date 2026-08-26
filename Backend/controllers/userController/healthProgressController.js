const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  authedUserId,
  readPagination,
  handleValidationError,
  parseRecordedAt,
  resolveHealthProgressSettings,
  parseHealthWeightKg,
  parseGlucoseValue,
  parseBloodPressureSys,
  parseBloodPressureDia,
  parseMenstrualDates,
  parseConditionBodyPart,
  normalizeGlucoseType,
  isFemaleUser,
} = require("../helpers/healthProgressControllerHelpers");
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
  let weightKg;
  let recordedAt;
  try {
    recordedAt = parseRecordedAt(body);
    weightKg = parseHealthWeightKg(
      body.weightKg ?? body.weight_kg ?? body.weight,
      body.unit || body.weightUnit || "kg"
    );
  } catch (err) {
    handleValidationError(err);
  }
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
      recordedAt,
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
  let type;
  let value;
  let recordedAt;
  try {
    recordedAt = parseRecordedAt(body);
    type = normalizeGlucoseType(body.type);
    value = parseGlucoseValue(body.value);
  } catch (err) {
    handleValidationError(err);
  }
  if (value == null) throw new AppError("value is required", 400);

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
      recordedAt,
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
  let sys;
  let dia;
  let recordedAt;
  try {
    recordedAt = parseRecordedAt(body);
    sys = parseBloodPressureSys(body.sys);
    dia = parseBloodPressureDia(body.dia);
  } catch (err) {
    handleValidationError(err);
  }
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
      recordedAt,
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
  if (!isFemaleUser(req.currentUser)) {
    throw new AppError("Menstrual cycle is only available for female clients", 403);
  }
  const body = req.body || {};
  let dates;
  try {
    dates = parseMenstrualDates(body);
  } catch (err) {
    handleValidationError(err);
  }

  let log;
  try {
    log = await createMenstrualCycleLog({
      userId,
      startDate: dates.startDate,
      endDate: dates.endDate,
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
  let bodyPartOther;
  let recordedAt;
  try {
    recordedAt = parseRecordedAt(body);
    ({ bodyPart, bodyPartOther } = parseConditionBodyPart(body));
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
      bodyPartOther,
      picKey,
      date: body.date,
      recordedAt,
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
