const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const { assertStaffCanAccessUser } = require("../staffAccess");
const {
  listBodyMeasurementsByUser,
  toPublicBodyMeasurement,
} = require("../../models/userBodyMeasurementModel");
const {
  listProgressPhotosByUser,
  toPublicProgressPhoto,
} = require("../../models/userProgressPhotoModel");
const {
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
} = require("../../models/healthProgressMetabolicMetricModel");

exports.getUserBodyAnalyticsController = asyncHandler(async (req, res) => {
  const userId = String(req.params.id || "").trim();
  if (!userId) throw new AppError("User id is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const [measurementResult, photoResult, metabolicLogs] = await Promise.all([
    listBodyMeasurementsByUser(userId, { page: 1, limit: 200 }),
    listProgressPhotosByUser(userId, { page: 1, limit: 200 }),
    listAllMetabolicMetricLogsByUser(userId, { limit: 200 }),
  ]);

  return res.status(200).json({
    status: true,
    message: "Body analytics fetched",
    bodyAnalytics: {
      measurements: measurementResult.items.map(toPublicBodyMeasurement),
      metabolicMetrics: metabolicLogs.map(toPublicMetabolicMetricLog),
      photos: photoResult.items.map(toPublicProgressPhoto),
    },
  });
});
