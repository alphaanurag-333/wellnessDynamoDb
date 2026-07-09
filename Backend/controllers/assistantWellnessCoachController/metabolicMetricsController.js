const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  readUserIdParam,
  readPagination,
  loadTargetUser,
} = require("../healthProgressControllerHelpers");
const { buildDashboardFromLogs, normalizeMetricTypeFilter } = require("../../utils/metabolicMetricsCalculations");
const { formatChartDate } = require("../../utils/healthProgressHelpers");
const {
  listMetabolicMetricLogsByUser,
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
} = require("../../models/healthProgressMetabolicMetricModel");
const {
  createFattyLiverMetricForUser,
} = require("../metabolicMetricsFattyLiverHelpers");

async function assistantContext(req) {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Metabolic health is only available for Heal users", 400);
  }
  return { userId, user };
}

exports.getAssistantMetabolicMetricsDashboardController = asyncHandler(async (req, res) => {
  const { userId, user } = await assistantContext(req);

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

exports.listAssistantMetabolicMetricHistoryController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);

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

exports.createAssistantFattyLiverMetricController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const actingCoachId = req.auth?.sub;

  const log = await createFattyLiverMetricForUser({
    userId,
    body: req.body || {},
    enteredByCoachId: actingCoachId,
  });

  return res.status(201).json({
    status: true,
    message: "Fatty liver index saved",
    log,
  });
});
