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
const { getUserById, updateUser } = require("../../models/userModel");
const {
  isLabReportSubmissionLocked,
  LAB_REPORT_SUBMISSION_LOCKED_MESSAGE,
} = require("../../utils/labReportSubmission");
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

async function submissionLockedForUser(userId, { reports } = {}) {
  const user = await getUserById(userId);
  const hasReports = Array.isArray(reports)
    ? reports.length > 0
    : (await listUserLabReportsByUserId(userId)).length > 0;
  return isLabReportSubmissionLocked(user, { hasReports });
}

async function assertLabReportSubmissionOpen(userId) {
  const user = await getUserById(userId);
  if (!user) throw new AppError("User not found", 404);
  if (user.labReportSubmissionLocked === true) {
    throw new AppError(LAB_REPORT_SUBMISSION_LOCKED_MESSAGE, 403);
  }
  if (user.labReportSubmissionLocked === false) return;
  const existing = await listUserLabReportsByUserId(userId);
  if (existing.length > 0) {
    throw new AppError(LAB_REPORT_SUBMISSION_LOCKED_MESSAGE, 403);
  }
}

async function lockLabReportSubmission(userId) {
  try {
    await updateUser(userId, { labReportSubmissionLocked: true });
  } catch (err) {
    console.error("Failed to lock lab report submission:", err?.message || err);
  }
}

exports.getUserRecommendedTestsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const recommendations = await listCoachRecommendedTestsByUserId(userId);
  const submissionLocked = await submissionLockedForUser(userId);

  return res.status(200).json({
    status: true,
    message: "Recommended tests fetched successfully",
    recommended: recommendations[0] || null,
    history: recommendations.length > 1 ? recommendations.slice(1) : [],
    submissionLocked,
  });
});

exports.listUserLabReportsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reports = await listUserLabReportsByUserId(userId);
  const submissionLocked = await submissionLockedForUser(userId, { reports });

  return res.status(200).json({
    status: true,
    message: "Lab reports fetched successfully",
    reports,
    submissionLocked,
  });
});

exports.createUserLabReportController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const reportDate = String(req.body?.reportDate || "").trim();
  if (!reportDate) throw new AppError("reportDate is required", 400);

  await assertLabReportSubmissionOpen(userId);

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

  await lockLabReportSubmission(userId);

  const user = await getUserById(userId);
  if (user) {
    dispatchLabReportUploadCoachNotificationAsync({
      user,
      reportId: report?.id,
    });
  }

  return res.status(201).json({
    status: true,
    message: "Lab report submitted successfully",
    report,
    submissionLocked: true,
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

  const submissionLocked = await submissionLockedForUser(userId);

  return res.status(200).json({
    status: true,
    message: "Lab report deleted successfully",
    submissionLocked,
  });
});
