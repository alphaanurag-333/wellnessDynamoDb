const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  readUserIdParam,
  readPagination,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
} = require("../../healthProgressControllerHelpers");
const { buildDashboardFromLogs, normalizeMetricTypeFilter } = require("../../../utils/metabolicMetricsCalculations");
const { formatChartDate } = require("../../../utils/healthProgressHelpers");
const {
  listMetabolicMetricLogsByUser,
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
} = require("../../../models/healthProgressMetabolicMetricModel");
const {
  createFattyLiverMetricForUser,
} = require("../../metabolicMetricsFattyLiverHelpers");

async function adminContext(req) {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);
  return { userId, user };
}

exports.getAdminMetabolicMetricsDashboardController = asyncHandler(async (req, res) => {
  const { userId, user } = await adminContext(req);

  const historyLimit = Math.min(50, Math.max(1, Number(req.query.historyLimit) || 20));
  const logs = await listAllMetabolicMetricLogsByUser(userId, { limit: historyLimit * 4 });
  const dashboard = buildDashboardFromLogs(logs, { formatChartDate });

  return res.status(200).json({
    status: true,
    message: "Metabolic health metrics fetched",
    dashboard,
    user: { id: user.id, name: user.name, gender: user.gender },
  });
});

exports.listAdminMetabolicMetricHistoryController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);

  const { page, limit } = readPagination(req);
  let metricType = null;
  if (req.params?.metricType || req.query?.metricType || req.query?.metric_type) {
    try {
      metricType = normalizeMetricTypeFilter(
        req.params?.metricType || req.query?.metricType || req.query?.metric_type
      );
    } catch (err) {
      throw new AppError(err.message, 400);
    }
  }

  const result = await listMetabolicMetricLogsByUser(userId, {
    page,
    limit,
    metricType,
  });

  return res.status(200).json({
    status: true,
    message: "Metabolic metric history fetched",
    logs: result.items.map(toPublicMetabolicMetricLog),
    pagination: result.pagination,
  });
});

exports.createAdminFattyLiverMetricController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const adminId = req.auth?.sub;

  const log = await createFattyLiverMetricForUser({
    userId,
    body: req.body || {},
    enteredByCoachId: adminId,
  });

  return res.status(201).json({
    status: true,
    message: "Fatty liver index saved",
    log,
  });
});
