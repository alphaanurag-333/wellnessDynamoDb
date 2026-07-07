const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getCoachInsightByUserId } = require("../../models/userCoachInsightModel");

exports.getMyCoachInsightController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const coachInsight = await getCoachInsightByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Coach insight fetched",
    coachInsight,
  });
});
