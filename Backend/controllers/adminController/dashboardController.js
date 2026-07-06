const { asyncHandler } = require("../../utils/asyncHandler");
const { getAdminDashboardStats } = require("../../services/adminDashboardStatsService");

exports.getDashboardStatistics = asyncHandler(async (req, res) => {
  const statistics = await getAdminDashboardStats();

  return res.status(200).json({
    status: true,
    message: "Dashboard statistics fetched",
    statistics,
  });
});
