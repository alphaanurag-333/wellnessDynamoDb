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
  getProgressPhotoById,
  toPublicProgressPhoto,
} = require("../../models/userProgressPhotoModel");
const {
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
} = require("../../models/healthProgressMetabolicMetricModel");
const { sendStoredObjectAsAttachment } = require("../../utils/s3");

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

const PROGRESS_PHOTO_ANGLE_KEYS = {
  front: "frontPicKey",
  right: "rightPicKey",
  left: "leftPicKey",
};

exports.downloadUserProgressPhotoController = asyncHandler(async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const photoId = String(req.params.photoId || "").trim();
  const angle = String(req.params.angle || "").trim().toLowerCase();
  const keyField = PROGRESS_PHOTO_ANGLE_KEYS[angle];

  if (!userId) throw new AppError("User id is required", 400);
  if (!photoId) throw new AppError("Photo id is required", 400);
  if (!keyField) throw new AppError("angle must be front, right, or left", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const photo = await getProgressPhotoById(photoId);
  if (!photo || String(photo.userId || "") !== userId) {
    throw new AppError("Progress photo not found", 404);
  }

  const objectKey = String(photo[keyField] || "").trim();
  if (!objectKey) throw new AppError("Photo file not found", 404);

  const ext = objectKey.match(/\.(jpe?g|png|webp|gif|heic)$/i)?.[1]?.toLowerCase() || "jpg";
  const filename = String(req.query.filename || `${angle}-photo.${ext}`).trim();

  await sendStoredObjectAsAttachment(res, objectKey, {
    filename,
    contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg",
  });
});
