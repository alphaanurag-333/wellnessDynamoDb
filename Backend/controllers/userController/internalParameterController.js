const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { uploadFileFromRequest } = require("../../utils/s3");
const {
  listCoachRecommendedTestsByUserId,
} = require("../../models/coachRecommendedTestModel");
const {
  createUserLabReport,
  listUserLabReportsByUserId,
  getUserLabReportRecordById,
  deleteUserLabReport,
  normalizeReportDate,
} = require("../../models/userLabReportModel");
const { getUserById, updateUser, normalizePaidOnboardingStepStatus } = require("../../models/userModel");
const {
  markStepDone,
  computePaidOnboardingCompleted,
} = require("../../utils/paidOnboardingHelpers");
const {
  dispatchLabReportUploadCoachNotificationAsync,
} = require("../../services/notificationDispatchService");

const S3_FOLDER = "user-lab-reports";

function assertPdfUpload(req) {
  if (!req?.file?.buffer) {
    throw new AppError("PDF file is required", 400);
  }
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are allowed", 400);
  }
}

async function uploadUserLabReportPdf(req) {
  assertPdfUpload(req);
  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) {
    throw new AppError("Failed to upload lab report PDF", 500);
  }
  return fileKey;
}

function handleValidationError(err) {
  if (err?.name === "ValidationError") {
    throw new AppError(err.message, 400);
  }
  throw err;
}

exports.getUserRecommendedTestsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const recommendations = await listCoachRecommendedTestsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Recommended tests fetched successfully",
    recommended: recommendations[0] || null,
    history: recommendations.length > 1 ? recommendations.slice(1) : [],
  });
});

exports.listUserLabReportsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reports = await listUserLabReportsByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Lab reports fetched successfully",
    reports,
  });
});

exports.createUserLabReportController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reportDate = String(req.body?.reportDate || "").trim();
  if (!reportDate) throw new AppError("reportDate is required", 400);

  const fileKey = await uploadUserLabReportPdf(req);

  let report;
  try {
    report = await createUserLabReport({
      userId,
      reportDate: normalizeReportDate(reportDate),
      fileKey,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const user = await getUserById(userId);
  if (user) {
    dispatchLabReportUploadCoachNotificationAsync({
      user,
      reportId: report?.id,
    });

    const currentStatus = normalizePaidOnboardingStepStatus(user.paidOnboardingStepStatus);
    const nextStatus = markStepDone(currentStatus, "internalParameter");
    await updateUser(userId, {
      paidOnboardingStepStatus: nextStatus,
      paidOnboardingCompleted: computePaidOnboardingCompleted(nextStatus),
    });
  }

  return res.status(201).json({
    status: true,
    message: "Lab report submitted successfully",
    report,
  });
});

exports.deleteUserLabReportController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reportId = String(req.params.id || "").trim();
  const record = await getUserLabReportRecordById(reportId);
  if (!record || String(record.userId || "") !== String(userId)) {
    throw new AppError("Lab report not found", 404);
  }

  try {
    await deleteUserLabReport(reportId);
  } catch (err) {
    if (err?.name === "NotFoundError") {
      throw new AppError("Lab report not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Lab report deleted successfully",
  });
});
