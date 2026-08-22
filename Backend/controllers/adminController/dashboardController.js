const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolveStaffActor } = require("../staffAccess");
const {
  getAdminDashboardStats,
  listDashboardPaymentsPaginated,
  DASHBOARD_PAYMENT_BUCKET_ORDER,
} = require("../../services/adminDashboardStatsService");
const { getCoachDashboardStats } = require("../../services/coachDashboardStatsService");
const { getAssistantDashboardStats } = require("../../services/assistantDashboardStatsService");
const { getProgramProgressOverview } = require("../../services/programProgressService");
const { getDashboardCommunity, emptyCommunity } = require("../../services/dashboardCommunityService");
const { sendTeamReminders } = require("../../services/teamReminderService");
const {
  getStoredObjectBuffer,
  parseKeyFromS3PublicUrl,
  normalizeStoredMedia,
} = require("../../utils/s3");

async function loadRoleStatistics(actor) {
  if (actor.role === "admin" || actor.role === "support") {
    return getAdminDashboardStats();
  }
  if (actor.role === "wellness_coach") {
    return getCoachDashboardStats(actor.id);
  }
  if (actor.role === "assistant_wellness_coach") {
    return getAssistantDashboardStats(actor.id);
  }
  if (actor.role === "trainee") {
    if (!actor.parentCoachId) throw new AppError("Trainee is not linked to a wellness coach", 400);
    return getCoachDashboardStats(actor.parentCoachId);
  }
  throw new AppError("Forbidden", 403);
}

exports.getStaffDashboardStatistics = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);

  let statistics;
  let overview = { programProgress: null, opsOverdue: null, schedule: null, staleRecords: null };
  let community = emptyCommunity();
  try {
    const [roleStats, progress, communityData] = await Promise.all([
      loadRoleStatistics(actor),
      getProgramProgressOverview(actor).catch((err) => {
        console.warn("[dashboard] program progress failed:", err?.message || err);
        return { programProgress: null, opsOverdue: null, schedule: null, staleRecords: null };
      }),
      getDashboardCommunity(actor).catch((err) => {
        console.warn("[dashboard] community failed:", err?.message || err);
        return emptyCommunity();
      }),
    ]);
    statistics = roleStats;
    overview = progress || overview;
    community = communityData || emptyCommunity();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || "Failed to load dashboard statistics", 400);
  }

  return res.status(200).json({
    status: true,
    message: "Dashboard statistics fetched",
    statistics: {
      ...statistics,
      programProgress: overview.programProgress,
      opsOverdue: overview.opsOverdue,
      schedule: overview.schedule,
      staleRecords: overview.staleRecords,
      community,
    },
  });
});

exports.getCoachDashboardStatistics = exports.getStaffDashboardStatistics;
exports.getDashboardStatistics = exports.getStaffDashboardStatistics;
exports.getAssistantDashboardStatistics = exports.getStaffDashboardStatistics;

exports.listStaffDashboardPayments = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  if (actor.role !== "admin" && actor.role !== "support") {
    throw new AppError("Forbidden", 403);
  }

  const month = String(req.query.month || "").trim();
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw new AppError("month must be YYYY-MM", 400);
  }

  const type = String(req.query.type || req.query.productType || "consultancy").trim().toLowerCase();
  if (!DASHBOARD_PAYMENT_BUCKET_ORDER.includes(type)) {
    throw new AppError("type must be consultancy, program, or app", 400);
  }

  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
  const result = await listDashboardPaymentsPaginated({ monthKey: month, productBucket: type, page, limit });

  return res.status(200).json({
    status: true,
    message: "Dashboard payments fetched",
    month: result.month,
    type: result.type,
    payments: result.payments,
    pagination: result.pagination,
    summary: result.summary,
  });
});

exports.sendTeamRemindersController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const message = String(req.body?.message || "").trim();
  const accountIds = Array.isArray(req.body?.accountIds) ? req.body.accountIds : [];
  const sent = await sendTeamReminders({ actor, accountIds, message });
  const count = sent.length;
  return res.status(200).json({
    status: true,
    message: count === 1
      ? `Notification sent to ${sent[0].name}`
      : `Notification sent to ${count} recipients`,
    sentCount: count,
    recipients: sent,
  });
});

exports.proxyDashboardMedia = asyncHandler(async (req, res) => {
  resolveStaffActor(req);
  const raw = String(req.query.url || "").trim();
  if (!raw) throw new AppError("url is required", 400);

  const s3Key = parseKeyFromS3PublicUrl(raw) || (
    !/^https?:\/\//i.test(raw) && !raw.startsWith("/")
      ? normalizeStoredMedia(raw)
      : null
  );
  if (!s3Key) throw new AppError("Unsupported media url", 400);

  const { buffer, contentType } = await getStoredObjectBuffer(s3Key);
  res.setHeader("Content-Type", contentType || "application/octet-stream");
  res.setHeader("Cache-Control", "private, max-age=300");
  return res.status(200).send(buffer);
});
