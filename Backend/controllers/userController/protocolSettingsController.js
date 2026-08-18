const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getLatestProtocolVersion,
  toPublicProtocolVersion,
} = require("../../models/userProtocolSettingModel");

exports.getMyProtocolSettingsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const latest = await getLatestProtocolVersion(userId);
  const current = toPublicProtocolVersion(latest);

  return res.status(200).json({
    status: true,
    message: "Protocol settings fetched",
    current,
  });
});
