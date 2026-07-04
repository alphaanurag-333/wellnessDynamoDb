const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getUserCommitmentLetterById,
  getUserCommitmentLetterRecordById,
  getLatestUserCommitmentLetterByUserId,
  listUserCommitmentLetters,
  reviewUserCommitmentLetter,
  deleteUserCommitmentLetter,
} = require("../../models/userCommitmentLetterModel");
const {
  readIdParam,
  assertCoachCanManageCommitmentLetter,
} = require("../commitmentLetterControllerHelpers");
const {
  loadTargetUser,
  assertAssistantCanAccessUser,
  readUserIdParam,
} = require("../reminderControllerHelpers");

function filterForAssistant(rows, assistantId) {
  return (rows || []).filter(
    (row) =>
      String(row.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(row.assignedCoachId || "") === String(assistantId)
  );
}

exports.listAssistantCommitmentLettersController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const { page = 1, limit = 20, approvalStatus, search } = req.query;
  const data = await listUserCommitmentLetters({
    page,
    limit,
    approvalStatus,
    search,
    managedByCoachId: parentCoachId,
  });

  const filtered = filterForAssistant(data.commitmentLetters, assistantId);

  return res.status(200).json({
    status: true,
    commitmentLetters: filtered,
    pagination: data.pagination,
  });
});

exports.listAssistantPendingCommitmentLettersController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const data = await listUserCommitmentLetters({
    page: 1,
    limit: 100,
    approvalStatus: "pending",
    managedByCoachId: parentCoachId,
  });

  const filtered = filterForAssistant(data.commitmentLetters, assistantId);

  return res.status(200).json({
    status: true,
    commitmentLetters: filtered,
    total: filtered.length,
  });
});

exports.getAssistantCommitmentLetterByIdController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const record = await getUserCommitmentLetterRecordById(readIdParam(req));
  if (!record) throw new AppError("Commitment letter not found", 404);
  assertCoachCanManageCommitmentLetter(record, { assistantId });

  const commitmentLetter = await getUserCommitmentLetterById(record.id);
  return res.status(200).json({ status: true, commitmentLetter });
});

exports.getAssistantUserCommitmentLetterController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAssistantCanAccessUser(user, assistantId);

  const commitmentLetter = await getLatestUserCommitmentLetterByUserId(userId);
  return res.status(200).json({
    status: true,
    commitmentLetter: commitmentLetter || null,
  });
});

exports.reviewAssistantCommitmentLetterController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const record = await getUserCommitmentLetterRecordById(id);
  if (!record) throw new AppError("Commitment letter not found", 404);
  assertCoachCanManageCommitmentLetter(record, { assistantId });

  if (String(record.approvalStatus || "") !== "pending") {
    throw new AppError("Commitment letter is not pending approval", 400);
  }

  const action = String(req.body.action || req.body.approvalStatus || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(action)) {
    throw new AppError("action must be approved or rejected", 400);
  }

  if (action === "rejected" && !String(req.body.rejectionReason || "").trim()) {
    throw new AppError("rejectionReason is required when rejecting", 400);
  }

  const commitmentLetter = await reviewUserCommitmentLetter(id, {
    approvalStatus: action,
    reviewedByRole: "assistant_wellness_coach",
    reviewedById: assistantId,
    rejectionReason: req.body.rejectionReason,
  });

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Commitment letter approved" : "Commitment letter rejected",
    commitmentLetter,
  });
});

exports.deleteAssistantCommitmentLetterController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const record = await getUserCommitmentLetterRecordById(id);
  if (!record) throw new AppError("Commitment letter not found", 404);
  assertCoachCanManageCommitmentLetter(record, { assistantId });

  await deleteUserCommitmentLetter(id);
  return res.status(200).json({
    status: true,
    message: "Commitment letter deleted successfully",
  });
});
