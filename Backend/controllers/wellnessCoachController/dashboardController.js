const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getCoachDashboardStats } = require("../../services/coachDashboardStatsService");

exports.getCoachDashboardStatistics = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  let statistics;
  try {
    statistics = await getCoachDashboardStats(coachId);
  } catch (err) {
    throw new AppError(err.message || "Failed to load dashboard statistics", 400);
  }

  return res.status(200).json({
    status: true,
    message: "Dashboard statistics fetched",
    statistics,
  });
});
