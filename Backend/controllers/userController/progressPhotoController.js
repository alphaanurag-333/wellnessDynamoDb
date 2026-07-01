const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadMulterField } = require("../../utils/s3");
const {
  getUserById,
  updateUser,
  normalizePaidOnboardingStepStatus,
} = require("../../models/userModel");
const { enrichUser } = require("./userProfileHelpers");
const {
  markStepDone,
  wizardStepAfterPhotosComplete,
  computePaidOnboardingCompleted,
} = require("../../utils/paidOnboardingHelpers");
const {
  createProgressPhoto,
  listProgressPhotosByUser,
  toPublicProgressPhoto,
} = require("../../models/userProgressPhotoModel");

function authedUserId(req) {
  return req.auth?.sub || req.user?.id;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function uploadAnglePic(req, fieldName, folder) {
  return uploadMulterField(req, fieldName, folder);
}

exports.createProgressPhotoController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const user = req.currentUser || (await getUserById(userId));
  if (!user) throw new AppError("User not found", 404);

  const body = req.body || {};
  const folder = "users/progress-photos";

  const [frontPicKey, rightPicKey, leftPicKey] = await Promise.all([
    uploadAnglePic(req, "front_pic", folder),
    uploadAnglePic(req, "right_pic", folder),
    uploadAnglePic(req, "left_pic", folder),
  ]);

  if (!frontPicKey || !rightPicKey || !leftPicKey) {
    throw new AppError("front_pic, right_pic, and left_pic are required", 400);
  }

  const photo = await createProgressPhoto({
    userId,
    frontPicKey,
    rightPicKey,
    leftPicKey,
    heightCm: body.heightCm ?? body.height_cm,
    weightKg: body.weightKg ?? body.weight_kg,
  });

  const currentStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);
  const nextStatus = markStepDone(currentStatus, "progressPhotos180");
  const nextWizardStep = wizardStepAfterPhotosComplete(user.paidOnboardingStep);

  const updated = await updateUser(userId, {
    paidOnboardingStepStatus: nextStatus,
    paidOnboardingStep: nextWizardStep,
    paidOnboardingCompleted: computePaidOnboardingCompleted(nextStatus),
  });

  return res.status(201).json({
    status: true,
    message: "Progress photos saved",
    data: {
      progressPhoto: toPublicProgressPhoto(photo),
      paidOnboardingStep: updated.paidOnboardingStep,
      paidOnboardingStepStatus: updated.paidOnboardingStepStatus,
      paidOnboardingCompleted: Boolean(updated.paidOnboardingCompleted),
      user: await enrichUser(updated),
    },
  });
});

exports.listProgressPhotosController = asyncHandler(async (req, res) => {
  const userId = authedUserId(req);
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));

  const result = await listProgressPhotosByUser(userId, { page, limit });

  return res.status(200).json({
    status: true,
    message: "Progress photos fetched",
    data: {
      photos: result.items.map(toPublicProgressPhoto),
      pagination: result.pagination,
    },
  });
});
