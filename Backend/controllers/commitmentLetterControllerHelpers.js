const AppError = require("../utils/AppError");
const { getUserById } = require("../models/userModel");

function readIdParam(req) {
  return String(req.params.id || req.params.letterId || "").trim();
}

function assertPdfUpload(req) {
  if (!req?.file?.buffer) {
    throw new AppError("PDF file is required", 400);
  }
  if (req.file.mimetype !== "application/pdf") {
    throw new AppError("Only PDF files are allowed", 400);
  }
}

function assertCoachCanManageCommitmentLetter(record, { coachId, assistantId } = {}) {
  const managedByCoachId = String(record?.managedByCoachId || "").trim();
  const assignedCoachType = String(record?.assignedCoachType || "").trim();
  const assignedCoachId = String(record?.assignedCoachId || "").trim();

  if (assistantId) {
    if (
      assignedCoachType === "assistant_wellness_coach" &&
      assignedCoachId === String(assistantId)
    ) {
      return;
    }
    throw new AppError("Commitment letter is not assigned to you", 403);
  }

  if (coachId && managedByCoachId === String(coachId)) return;
  throw new AppError("Commitment letter is not under your coaching hierarchy", 403);
}

function readCommitmentLetterUserId(record) {
  return String(record?.userId || "").trim();
}

function approvalLabel(status) {
  const value = String(status || "").toLowerCase();
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  return "Pending";
}

module.exports = {
  readIdParam,
  assertPdfUpload,
  assertCoachCanManageCommitmentLetter,
  readCommitmentLetterUserId,
  approvalLabel,
};
