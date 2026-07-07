const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  authedUserId,
  readPagination,
  handleValidationError,
  parseRecordedAt,
  toNumberOrNull,
} = require("../healthProgressControllerHelpers");
const {
  ageFromDob,
  normalizeMetricType,
  buildMetricSnapshot,
  buildDashboardFromLogs,
} = require("../../utils/metabolicMetricsCalculations");
const { formatChartDate } = require("../../utils/healthProgressHelpers");
const {
  createMetabolicMetricLog,
  listMetabolicMetricLogsByUser,
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
} = require("../../models/healthProgressMetabolicMetricModel");

function readMetricInputs(body, user) {
  const gender = body.gender ?? body.gender_type ?? user?.gender;
  const age =
    toNumberOrNull(body.age) ??
    ageFromDob(user?.dob);

  return {
    gender,
    age,
    heightCm: toNumberOrNull(body.heightCm ?? body.height_cm),
    weightKg: toNumberOrNull(body.weightKg ?? body.weight_kg),
    neckCm: toNumberOrNull(body.neckCm ?? body.neck_cm),
    waistCm: toNumberOrNull(body.waistCm ?? body.waist_cm),
    hipCm: toNumberOrNull(body.hipCm ?? body.hip_cm),
    activityLevel: body.activityLevel ?? body.activity_level ?? "moderately_active",
    bodyFatGoal: toNumberOrNull(body.bodyFatGoal ?? body.body_fat_goal),
  };
}

function resolveMetricTypeFromRequest(req) {
  const fromParam = req.params?.metricType;
  const fromBody = req.body?.metricType ?? req.body?.metric_type;
  const fromQuery = req.query?.metricType ?? req.query?.metric_type;
  try {
    return normalizeMetricType(fromParam || fromBody || fromQuery);
  } catch (err) {
    throw new AppError(err.message, 400);
  }
}

exports.createMetabolicMetricController = asyncHandler(async (req, res) => {
  const user = req.currentUser;
  const userId = authedUserId(req);
  const metricType = resolveMetricTypeFromRequest(req);
  const body = req.body || {};
  const inputs = readMetricInputs(body, user);

  let snapshot;
  try {
    snapshot = buildMetricSnapshot(metricType, inputs);
  } catch (err) {
    handleValidationError(err);
  }

  let log;
  try {
    log = await createMetabolicMetricLog({
      userId,
      ...snapshot,
      recordedAt: parseRecordedAt(body),
    });
  } catch (err) {
    handleValidationError(err);
  }

  return res.status(201).json({
    status: true,
    message: "Metabolic metric saved",
    data: { log: toPublicMetabolicMetricLog(log) },
  });
});

exports.listMetabolicMetricHistoryController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const { page, limit } = readPagination(req);
  let metricType = null;
  if (req.params?.metricType || req.query?.metricType || req.query?.metric_type) {
    metricType = resolveMetricTypeFromRequest(req);
  }

  const result = await listMetabolicMetricLogsByUser(userId, {
    page,
    limit,
    metricType,
  });

  return res.status(200).json({
    status: true,
    message: "Metabolic metric history fetched",
    data: {
      logs: result.items.map(toPublicMetabolicMetricLog),
      pagination: result.pagination,
    },
  });
});

exports.getMetabolicMetricsDashboardController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const historyLimit = Math.min(50, Math.max(1, Number(req.query.historyLimit) || 20));
  const logs = await listAllMetabolicMetricLogsByUser(userId, { limit: historyLimit * 4 });
  const dashboard = buildDashboardFromLogs(logs, { formatChartDate });

  return res.status(200).json({
    status: true,
    message: "Metabolic health metrics fetched",
    data: { dashboard },
  });
});

exports.getMetabolicMetricsProfileController = asyncHandler(async (req, res) => {
  const user = req.currentUser;

  return res.status(200).json({
    status: true,
    message: "Metabolic health profile fetched",
    data: {
      gender: user.gender,
      dob: user.dob,
    },
  });
});
