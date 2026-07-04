const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const { getAppConfig, toPublicAppConfig } = require("../../models/appConfigModel");
const {
  createUserCommitmentLetter,
  getLatestUserCommitmentLetterByUserId,
  getUserCommitmentLetterRecordById,
  resubmitUserCommitmentLetter,
} = require("../../models/userCommitmentLetterModel");
const { uploadFileFromRequest, deleteStoredMedia } = require("../../utils/s3");
const { resolveAssignedCoachForUser } = require("../mealTrackingControllerHelpers");
const {
  assertPdfUpload,
  readCommitmentLetterUserId,
} = require("../commitmentLetterControllerHelpers");

const S3_FOLDER = "user-commitment-letters";

async function uploadCommitmentLetterPdf(req) {
  assertPdfUpload(req);
  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) throw new AppError("Failed to upload commitment letter PDF", 500);
  return fileKey;
}

exports.getUserCommitmentLetterTemplateController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const config = await getAppConfig();
  const publicConfig = toPublicAppConfig(config);
  const templateUrl = publicConfig?.commitment_letter_template || "";

  if (!templateUrl) {
    throw new AppError("Commitment letter template is not available yet", 404);
  }

  return res.status(200).json({
    status: true,
    message: "Commitment letter template fetched",
    templateUrl,
  });
});

exports.getUserCommitmentLetterController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const commitmentLetter = await getLatestUserCommitmentLetterByUserId(userId);

  return res.status(200).json({
    status: true,
    commitmentLetter: commitmentLetter || null,
  });
});

exports.submitUserCommitmentLetterController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = req.user || (await getUserById(userId));
  if (!user) throw new AppError("User not found", 404);

  const config = await getAppConfig();
  if (!config?.commitment_letter_template) {
    throw new AppError("Commitment letter template is not configured yet", 400);
  }

  const existing = await getLatestUserCommitmentLetterByUserId(userId);
  if (existing) {
    throw new AppError(
      "You already have a commitment letter submission. Use resubmit when rejected or while pending.",
      409
    );
  }

  const pdfKey = await uploadCommitmentLetterPdf(req);
  const coachAssignment = resolveAssignedCoachForUser(user);

  const commitmentLetter = await createUserCommitmentLetter({
    userId,
    pdfKey,
    approvalStatus: "pending",
    managedByCoachId: coachAssignment.coachId || null,
    assignedCoachType: coachAssignment.assignedCoachType || null,
    assignedCoachId: coachAssignment.assignedCoachId || null,
  });

  return res.status(201).json({
    status: true,
    message: "Commitment letter submitted for approval",
    commitmentLetter,
  });
});

exports.resubmitUserCommitmentLetterController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const existing = await getLatestUserCommitmentLetterByUserId(userId);
  if (!existing) {
    throw new AppError("No commitment letter found to resubmit", 404);
  }

  const record = await getUserCommitmentLetterRecordById(existing.id);
  if (!record || readCommitmentLetterUserId(record) !== String(userId)) {
    throw new AppError("Commitment letter not found", 404);
  }

  const approval = String(record.approvalStatus || "").toLowerCase();
  if (approval === "approved") {
    throw new AppError("Approved commitment letters cannot be resubmitted", 400);
  }

  const pdfKey = await uploadCommitmentLetterPdf(req);
  if (record.pdfKey && record.pdfKey !== pdfKey) {
    await deleteStoredMedia(record.pdfKey);
  }

  const commitmentLetter = await resubmitUserCommitmentLetter(record.id, {
    pdfKey,
    resubmissionCount: (Number(record.resubmissionCount) || 0) + 1,
  });

  return res.status(200).json({
    status: true,
    message: "Commitment letter resubmitted for approval",
    commitmentLetter,
  });
});
