const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getAssistantDashboardStats } = require("../../services/assistantDashboardStatsService");

exports.getAssistantDashboardStatistics = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  let statistics;
  try {
    statistics = await getAssistantDashboardStats(assistantId);
  } catch (err) {
    throw new AppError(err.message || "Failed to load dashboard statistics", 400);
  }

  return res.status(200).json({
    status: true,
    message: "Dashboard statistics fetched",
    statistics,
  });
});
