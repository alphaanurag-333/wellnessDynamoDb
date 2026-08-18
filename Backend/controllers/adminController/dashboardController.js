const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolveStaffActor } = require("../staffAccess");
const { getAdminDashboardStats } = require("../../services/adminDashboardStatsService");
const { getCoachDashboardStats } = require("../../services/coachDashboardStatsService");
const { getAssistantDashboardStats } = require("../../services/assistantDashboardStatsService");
const { getProgramProgressOverview } = require("../../services/programProgressService");

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
  let overview = { programProgress: null, opsOverdue: null };
  try {
    const [roleStats, progress] = await Promise.all([
      loadRoleStatistics(actor),
      getProgramProgressOverview(actor).catch((err) => {
        console.warn("[dashboard] program progress failed:", err?.message || err);
        return { programProgress: null, opsOverdue: null };
      }),
    ]);
    statistics = roleStats;
    overview = progress || overview;
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
    },
  });
});

exports.getCoachDashboardStatistics = exports.getStaffDashboardStatistics;
exports.getDashboardStatistics = exports.getStaffDashboardStatistics;
exports.getAssistantDashboardStatistics = exports.getStaffDashboardStatistics;
