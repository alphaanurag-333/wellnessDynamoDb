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
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  uploadBufferToS3,
  resolvePublicUrl,
} = require("../../utils/s3");
const { resolveCommitmentLetterText } = require("../../utils/coachContent");
const { generateCommitmentLetterPdf } = require("../../utils/commitmentLetterPdf");
const { resolveAssignedCoachForUser } = require("../helpers/mealTrackingControllerHelpers");
const {
  assertPdfUpload,
  readCommitmentLetterUserId,
} = require("../helpers/commitmentLetterControllerHelpers");

const S3_FOLDER = "user-commitment-letters";
const TEMPLATE_PDF_FOLDER = "commitment-letter-templates";

async function uploadCommitmentLetterPdf(req) {
  assertPdfUpload(req);
  const fileKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (!fileKey) throw new AppError("Failed to upload commitment letter PDF", 500);
  return fileKey;
}

async function buildTemplatePdfPayload(userId) {
  const [config, user] = await Promise.all([getAppConfig(), getUserById(userId)]);
  if (!user) throw new AppError("User not found", 404);

  const publicConfig = toPublicAppConfig(config) || {};
  const text = resolveCommitmentLetterText(publicConfig.commitment_letter_text);
  if (!text) {
    throw new AppError("Commitment letter template is not available yet", 404);
  }

  const version = Math.max(1, Number(publicConfig.commitment_letter_version) || 1);
  const pdfBuffer = await generateCommitmentLetterPdf({
    text,
    clientName: user.name || "",
    version,
    appName: publicConfig.app_name || "India Redefining Wellness",
  });

  const pdfKey = await uploadBufferToS3({
    buffer: pdfBuffer,
    contentType: "application/pdf",
    folder: TEMPLATE_PDF_FOLDER,
    originalName: `commitment-letter-v${version}.pdf`,
  });
  if (!pdfKey) throw new AppError("Failed to generate commitment letter PDF", 500);

  const templateUrl = resolvePublicUrl(pdfKey);
  if (!templateUrl) {
    throw new AppError("Failed to resolve commitment letter PDF URL", 500);
  }

  return { text, version, templateUrl };
}

exports.getUserCommitmentLetterTemplateController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub;
  if (!userId) throw new AppError("Unauthorized", 401);

  const { text, version, templateUrl } = await buildTemplatePdfPayload(userId);

  return res.status(200).json({
    status: true,
    message: "Commitment letter template fetched",
    text,
    version,
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
  const letterText = resolveCommitmentLetterText(config?.commitment_letter_text);
  if (!letterText) {
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
