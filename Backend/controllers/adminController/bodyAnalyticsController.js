const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const { assertStaffCanAccessUser, assertStaffCanMutate } = require("../staffAccess");
const {
  listBodyMeasurementsByUser,
  getBodyMeasurementById,
  reviewWeightPhoto,
  toPublicBodyMeasurement,
} = require("../../models/userBodyMeasurementModel");
const {
  listProgressPhotosByUser,
  getProgressPhotoById,
  reviewProgressPhotoAngle,
  toPublicProgressPhoto,
  normalizeReviewStatus,
} = require("../../models/userProgressPhotoModel");
const { dispatchProgressPhotoReviewedNotification } = require("../../services/notificationDispatchService");
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

const PHOTO_ANGLE_LABELS = {
  front: "Front",
  right: "Right",
  left: "Left",
  weight: "Weight",
};

function readReviewAction(body) {
  const action = String(body?.action || body?.status || "").trim().toLowerCase();
  if (action !== "approved" && action !== "rejected") {
    throw new AppError("action must be approved or rejected", 400);
  }
  const rejectionReason = String(body?.rejectionReason || "").trim();
  if (rejectionReason.length > 500) {
    throw new AppError("rejectionReason cannot exceed 500 characters", 400);
  }
  return { action, rejectionReason: action === "rejected" ? rejectionReason : "" };
}

exports.downloadUserProgressPhotoController = asyncHandler(async (req, res) => {
  const userId = String(req.params.id || "").trim();
  const photoId = String(req.params.photoId || "").trim();
  const angle = String(req.params.angle || "").trim().toLowerCase();

  if (!userId) throw new AppError("User id is required", 400);
  if (!photoId) throw new AppError("Photo id is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  let objectKey = "";
  if (angle === "weight") {
    const measurement = await getBodyMeasurementById(photoId);
    if (!measurement || String(measurement.userId || "") !== userId) {
      throw new AppError("Weight photo not found", 404);
    }
    objectKey = String(measurement.weightPicKey || "").trim();
  } else {
    const keyField = PROGRESS_PHOTO_ANGLE_KEYS[angle];
    if (!keyField) throw new AppError("angle must be front, right, left, or weight", 400);

    const photo = await getProgressPhotoById(photoId);
    if (!photo || String(photo.userId || "") !== userId) {
      throw new AppError("Progress photo not found", 404);
    }
    objectKey = String(photo[keyField] || "").trim();
  }

  if (!objectKey) throw new AppError("Photo file not found", 404);

  const ext = objectKey.match(/\.(jpe?g|png|webp|gif|heic)$/i)?.[1]?.toLowerCase() || "jpg";
  const filename = String(req.query.filename || `${angle}-photo.${ext}`).trim();

  await sendStoredObjectAsAttachment(res, objectKey, {
    filename,
    contentType: ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg",
  });
});

exports.reviewUserProgressPhotoController = asyncHandler(async (req, res) => {
  const actor = assertStaffCanMutate(req);
  const userId = String(req.params.id || "").trim();
  const photoId = String(req.params.photoId || "").trim();
  const angle = String(req.params.angle || "").trim().toLowerCase();

  if (!userId) throw new AppError("User id is required", 400);
  if (!photoId) throw new AppError("Photo id is required", 400);
  if (!PHOTO_ANGLE_LABELS[angle]) {
    throw new AppError("angle must be front, right, left, or weight", 400);
  }

  const { action, rejectionReason } = readReviewAction(req.body);
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  let updated;
  if (angle === "weight") {
    const measurement = await getBodyMeasurementById(photoId);
    if (!measurement || String(measurement.userId || "") !== userId || !measurement.weightPicKey) {
      throw new AppError("Weight photo not found", 404);
    }
    if (normalizeReviewStatus(measurement.weightReviewStatus) !== "pending") {
      throw new AppError("This photo is not pending review", 400);
    }
    updated = toPublicBodyMeasurement(await reviewWeightPhoto(photoId, {
      status: action,
      reviewedById: actor.id,
      rejectionReason,
    }));
  } else {
    const photo = await getProgressPhotoById(photoId);
    if (!photo || String(photo.userId || "") !== userId) {
      throw new AppError("Progress photo not found", 404);
    }
    if (!photo[PROGRESS_PHOTO_ANGLE_KEYS[angle]]) {
      throw new AppError("Photo file not found", 404);
    }
    if (normalizeReviewStatus(photo[`${angle}ReviewStatus`]) !== "pending") {
      throw new AppError("This photo is not pending review", 400);
    }
    updated = toPublicProgressPhoto(await reviewProgressPhotoAngle(photoId, angle, {
      status: action,
      reviewedById: actor.id,
      rejectionReason,
    }));
  }

  dispatchProgressPhotoReviewedNotification({
    userId,
    photoId,
    angle,
    status: action,
    rejectionReason,
    coachName: actor.displayName || "Your coach",
    actorUserId: actor.id,
  }).catch((err) => {
    console.error("Progress photo review notification failed:", err?.message || err);
  });

  const label = PHOTO_ANGLE_LABELS[angle];
  return res.status(200).json({
    status: true,
    message: action === "approved" ? `${label} photo accepted` : `${label} photo rejected`,
    angle,
    photo: updated,
  });
});
