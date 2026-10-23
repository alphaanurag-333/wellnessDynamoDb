const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getUserById,
  updateUser,
  isBodyMeasurementEnabled,
  isProgressPhotosInAppEnabled,
} = require("../../models/userModel");
const { assertStaffCanAccessUser, assertStaffCanMutate } = require("../staffAccess");
const { enrichUser } = require("../userController/userProfileHelpers");
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
  reviewProgressPhotoAngles,
  anglesPresentOnPhoto,
  toPublicProgressPhoto,
  normalizeReviewStatus,
} = require("../../models/userProgressPhotoModel");
const { dispatchProgressPhotoReviewedNotification } = require("../../services/notificationDispatchService");
const { notifyOnboardingWhatsAppTransitions } = require("../../services/whatsappJourneyService");
const {
  applyBodyAnalyticsPhotoReview,
  buildOnboardingPersistUpdates,
  countCompletedSteps,
  normalizePaidOnboardingStepStatus,
  markStepSkipped,
  wizardStepAfterSkip,
  computePaidOnboardingCompleted,
} = require("../../utils/paidOnboardingHelpers");
const { progressPhotoCalendarDay, recordStamp, recordsOnSameDay } = require("../../utils/progressPhotoDay");
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
    bodyMeasurementEnabled: isBodyMeasurementEnabled(user),
    progressPhotosInAppEnabled: isProgressPhotosInAppEnabled(user),
    bodyAnalytics: {
      measurements: measurementResult.items.map(toPublicBodyMeasurement),
      metabolicMetrics: metabolicLogs.map(toPublicMetabolicMetricLog),
      photos: photoResult.items.map(toPublicProgressPhoto),
    },
  });
});

function parseEnabledBodyFlag(body = {}) {
  if (body.enabled === undefined && body.value === undefined) {
    return { missing: true, enabled: null };
  }
  const raw = body.enabled !== undefined ? body.enabled : body.value;
  if (raw === true || raw === false) {
    return { missing: false, enabled: raw };
  }
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === "true") return { missing: false, enabled: true };
  if (normalized === "false") return { missing: false, enabled: false };
  return { missing: false, enabled: null };
}

exports.patchBodyMeasurementSettingsController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const userId = String(req.params.id || "").trim();
  if (!userId) throw new AppError("User id is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const parsed = parseEnabledBodyFlag({
    enabled:
      req.body.enabled !== undefined ? req.body.enabled : req.body.bodyMeasurementEnabled,
  });
  if (parsed.missing) throw new AppError("enabled is required", 400);
  if (parsed.enabled == null) throw new AppError("enabled must be true or false", 400);
  const enabled = parsed.enabled;

  const updated = await updateUser(userId, { bodyMeasurementEnabled: enabled });

  return res.status(200).json({
    status: true,
    message: enabled
      ? "Client can fill body measurements (this section only)"
      : "Client cannot fill body measurements until you turn this on",
    enabled: isBodyMeasurementEnabled(updated),
    bodyMeasurementEnabled: isBodyMeasurementEnabled(updated),
    user: await enrichUser(updated),
  });
});

exports.patchProgressPhotosInAppSettingsController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const userId = String(req.params.id || "").trim();
  if (!userId) throw new AppError("User id is required", 400);

  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  await assertStaffCanAccessUser(req, user);

  const parsed = parseEnabledBodyFlag({
    enabled:
      req.body.enabled !== undefined ? req.body.enabled : req.body.progressPhotosInAppEnabled,
  });
  if (parsed.missing) throw new AppError("enabled is required", 400);
  if (parsed.enabled == null) throw new AppError("enabled must be true or false", 400);
  const enabled = parsed.enabled;

  const updates = { progressPhotosInAppEnabled: enabled };

  if (!enabled) {
    const currentStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);
    if (currentStatus.progressPhotos180 === "pending") {
      const nextStatus = markStepSkipped(currentStatus, "progressPhotos180");
      updates.paidOnboardingStepStatus = nextStatus;
      const nextWizardStep = wizardStepAfterSkip(user.paidOnboardingStep, "progressPhotos180");
      if (nextWizardStep && nextWizardStep !== user.paidOnboardingStep) {
        updates.paidOnboardingStep = nextWizardStep;
      }
      updates.paidOnboardingCompleted = computePaidOnboardingCompleted(nextStatus);
    }
  }

  const updated = await updateUser(userId, updates);

  return res.status(200).json({
    status: true,
    message: enabled
      ? "Client can upload progress photos in the app"
      : "Progress photos are hidden from the client app",
    enabled: isProgressPhotosInAppEnabled(updated),
    progressPhotosInAppEnabled: isProgressPhotosInAppEnabled(updated),
    user: await enrichUser(updated),
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

function withRecord(list, extra) {
  if (!extra?.id) return list;
  if ((list || []).some((row) => String(row.id) === String(extra.id))) return list;
  return [...(list || []), extra];
}

async function listAllByUser(listFn, userId) {
  const items = [];
  let page = 1;
  let pages = 1;
  do {
    const result = await listFn(userId, { page, limit: 200 });
    items.push(...(result.items || []));
    pages = Number(result.pagination?.pages) || 1;
    page += 1;
  } while (page <= pages);
  return items;
}

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
  let rejectedPhotos = [];
  let rejectedMeasurements = [];
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
    if (action === "rejected") {
      const dayResult = await rejectPhotosForDay({
        userId,
        day: progressPhotoCalendarDay(recordStamp(photo)),
        reviewedById: actor.id,
        rejectionReason,
        fallbackPhoto: photo,
      });
      rejectedPhotos = dayResult.rejectedPhotos;
      rejectedMeasurements = dayResult.rejectedMeasurements;
      updated = rejectedPhotos.find((row) => String(row.id) === photoId) || rejectedPhotos[0];
    } else {
      updated = toPublicProgressPhoto(await reviewProgressPhotoAngle(photoId, angle, {
        status: action,
        reviewedById: actor.id,
        rejectionReason,
      }));
    }
  }

  const rejectedAngleDay = action === "rejected" && angle !== "weight";
  dispatchProgressPhotoReviewedNotification({
    userId,
    photoId,
    angle,
    status: action,
    rejectionReason,
    rejectDay: rejectedAngleDay,
    coachName: actor.displayName || "Your coach",
    actorUserId: actor.id,
  }).catch((err) => {
    console.error("Progress photo review notification failed:", err?.message || err);
  });

  let onboarding = null;
  try {
    const nextStatus = rejectedAngleDay
      ? applyBodyAnalyticsPhotoReview(user.paidOnboardingStepStatus, {
        angle,
        action: "rejected",
        photo: rejectedPhotos[0] || updated,
      }) || normalizePaidOnboardingStepStatus({
        ...user.paidOnboardingStepStatus,
        bodyAnalytics: "pending",
        progressPhotos180: "pending",
      })
      : (angle === "weight" ? null : applyBodyAnalyticsPhotoReview(user.paidOnboardingStepStatus, {
        angle,
        action,
        photo: updated,
      }));
    if (nextStatus) {
      const updates = buildOnboardingPersistUpdates(user, user.paidOnboardingStepStatus, nextStatus, {
        ...(rejectedAngleDay ? { paidOnboardingStep: "photos180" } : {}),
      });
      const saved = await updateUser(userId, updates);
      const paidOnboardingStepStatus = saved?.paidOnboardingStepStatus || updates.paidOnboardingStepStatus;
      onboarding = {
        paidOnboardingStep: saved?.paidOnboardingStep || updates.paidOnboardingStep || null,
        paidOnboardingStepStatus,
        paidOnboardingCompleted: Boolean(saved?.paidOnboardingCompleted),
        completedStepsCount: countCompletedSteps(paidOnboardingStepStatus),
      };
      notifyOnboardingWhatsAppTransitions({
        user: saved || user,
        previousStatus: user.paidOnboardingStepStatus,
        nextStatus: paidOnboardingStepStatus,
      });
    }
  } catch (err) {
    console.error("Body analytics onboarding sync failed:", err?.message || err);
  }

  const label = PHOTO_ANGLE_LABELS[angle];
  return res.status(200).json({
    status: true,
    message: rejectedAngleDay
      ? "This day's 180° photos were rejected. The client can submit Front, Right, and Left again."
      : action === "rejected"
        ? `${label} photo rejected`
        : `${label} photo accepted`,
    angle,
    photo: updated,
    ...(rejectedAngleDay ? { rejectedPhotos, rejectedMeasurements } : {}),
    ...(onboarding || {}),
  });
});

async function rejectPhotosForDay({
  userId,
  day,
  reviewedById,
  rejectionReason,
  fallbackPhoto = null,
}) {
  const photos = await listAllByUser(listProgressPhotosByUser, userId);
  const photosToReject = withRecord(recordsOnSameDay(photos, day), fallbackPhoto);

  const rejectedPhotos = [];
  for (const photo of photosToReject) {
    const angles = anglesPresentOnPhoto(photo);
    if (!angles.length) continue;
    rejectedPhotos.push(toPublicProgressPhoto(await reviewProgressPhotoAngles(photo.id, angles, {
      status: "rejected",
      reviewedById,
      rejectionReason,
    })));
  }

  return { rejectedPhotos, rejectedMeasurements: [] };
}
