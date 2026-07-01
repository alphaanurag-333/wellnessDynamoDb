const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  listCoachRecommendedSupplementsByUserId,
  markDeliveryRequested,
  saveBillPdf,
} = require("../../models/coachRecommendedSupplementModel");
const { getUserById } = require("../../models/userModel");
const {
  dispatchSupplementDeliveryRequestedCoachNotificationAsync,
  dispatchSupplementBillUploadedCoachNotificationAsync,
} = require("../../services/notificationDispatchService");
const { loadRecommendationForUser } = require("../supplementControllerHelpers");

const S3_FOLDER = "supplement-bills";

function assertPdfUpload(req) {
  if (!req?.file?.buffer) {
    throw new AppError("PDF file is required", 400);
  }
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are allowed", 400);
  }
}

function handleValidationError(err) {
  if (err?.name === "ValidationError") {
    throw new AppError(err.message, 400);
  }
  if (err?.name === "NotFoundError") {
    throw new AppError(err.message, 404);
  }
  throw err;
}

exports.getUserSupplementRecommendationsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const recommendations = await listCoachRecommendedSupplementsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Supplement recommendations fetched successfully",
    recommended: recommendations[0] || null,
    history: recommendations.length > 1 ? recommendations.slice(1) : [],
    recommendations,
  });
});

exports.requestSupplementDeliveryController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const recommendationId = String(req.params.id || "").trim();
  await loadRecommendationForUser(recommendationId, userId);

  let recommendation;
  try {
    recommendation = await markDeliveryRequested(recommendationId);
  } catch (err) {
    handleValidationError(err);
  }

  const user = await getUserById(userId);
  dispatchSupplementDeliveryRequestedCoachNotificationAsync({
    user,
    recommendationId,
  });

  return res.status(200).json({
    status: true,
    message: "Delivery request sent successfully",
    recommendation,
  });
});

exports.uploadSupplementBillController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const recommendationId = String(req.params.id || "").trim();
  await loadRecommendationForUser(recommendationId, userId);
  assertPdfUpload(req);

  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) {
    throw new AppError("Failed to upload bill PDF", 500);
  }

  let recommendation;
  try {
    recommendation = await saveBillPdf(recommendationId, fileKey);
  } catch (err) {
    handleValidationError(err);
  }

  const user = await getUserById(userId);
  dispatchSupplementBillUploadedCoachNotificationAsync({
    user,
    recommendationId,
  });

  return res.status(200).json({
    status: true,
    message: "Bill uploaded successfully",
    recommendation,
  });
});
