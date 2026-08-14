const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { resolveStaffActor } = require("../staffAccess");
const { getAdminDashboardStats } = require("../../services/adminDashboardStatsService");
const { getCoachDashboardStats } = require("../../services/coachDashboardStatsService");
const { getAssistantDashboardStats } = require("../../services/assistantDashboardStatsService");

exports.getStaffDashboardStatistics = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);

  let statistics;
  try {
    if (actor.role === "admin" || actor.role === "support") {
      statistics = await getAdminDashboardStats();
    } else if (actor.role === "wellness_coach") {
      statistics = await getCoachDashboardStats(actor.id);
    } else if (actor.role === "assistant_wellness_coach") {
      statistics = await getAssistantDashboardStats(actor.id);
    } else if (actor.role === "trainee") {
      if (!actor.parentCoachId) throw new AppError("Trainee is not linked to a wellness coach", 400);
      statistics = await getCoachDashboardStats(actor.parentCoachId);
    } else {
      throw new AppError("Forbidden", 403);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(err.message || "Failed to load dashboard statistics", 400);
  }

  return res.status(200).json({
    status: true,
    message: "Dashboard statistics fetched",
    statistics,
  });
});

exports.getCoachDashboardStatistics = exports.getStaffDashboardStatistics;
exports.getDashboardStatistics = exports.getStaffDashboardStatistics;
exports.getAssistantDashboardStatistics = exports.getStaffDashboardStatistics;
