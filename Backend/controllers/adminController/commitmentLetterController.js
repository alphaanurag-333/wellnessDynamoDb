const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getUserCommitmentLetterById,
  getUserCommitmentLetterRecordById,
  getLatestUserCommitmentLetterByUserId,
  deleteUserCommitmentLetter,
  listUserCommitmentLetters,
  reviewUserCommitmentLetter,
} = require("../../models/userCommitmentLetterModel");
const {
  readIdParam,
  assertStaffCanManageCommitmentLetter,
} = require("../helpers/commitmentLetterControllerHelpers");
const {
  loadTargetUser,
  assertStaffCanAccessUser,
  readUserIdParam,
} = require("../helpers/reminderControllerHelpers");
const { resolveStaffActor, getStaffScopeCoachId, assertStaffCanMutate } = require("../staffAccess");

exports.listAdminCommitmentLettersController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, approvalStatus, search, userId } = req.query;
  const data = await listUserCommitmentLetters({
    page,
    limit,
    approvalStatus,
    search,
    userId: String(userId || "").trim() || undefined,
  });

  return res.status(200).json({
    status: true,
    commitmentLetters: data.commitmentLetters,
    pagination: data.pagination,
  });
});

exports.getAdminCommitmentLetterByIdController = asyncHandler(async (req, res) => {
  const commitmentLetter = await getUserCommitmentLetterById(readIdParam(req));
  if (!commitmentLetter) throw new AppError("Commitment letter not found", 404);
  return res.status(200).json({ status: true, commitmentLetter });
});

exports.reviewAdminCommitmentLetterController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const id = readIdParam(req);
  const record = await getUserCommitmentLetterRecordById(id);
  if (!record) throw new AppError("Commitment letter not found", 404);

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
    reviewedByRole: "admin",
    reviewedById: adminId,
    rejectionReason: req.body.rejectionReason,
  });

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Commitment letter approved" : "Commitment letter rejected",
    commitmentLetter,
  });
});

exports.deleteAdminCommitmentLetterController = asyncHandler(async (req, res) => {
  const id = readIdParam(req);
  const record = await getUserCommitmentLetterRecordById(id);
  if (!record) throw new AppError("Commitment letter not found", 404);

  await deleteUserCommitmentLetter(id);
  return res.status(200).json({
    status: true,
    message: "Commitment letter deleted successfully",
  });
});

exports.listCoachCommitmentLettersController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const { page = 1, limit = 20, approvalStatus, search } = req.query;
  const data = await listUserCommitmentLetters({
    page,
    limit,
    approvalStatus,
    search,
    managedByCoachId: actor.role === "admin" ? undefined : getStaffScopeCoachId(req),
  });

  return res.status(200).json({
    status: true,
    commitmentLetters: data.commitmentLetters,
    pagination: data.pagination,
  });
});

exports.listCoachPendingCommitmentLettersController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  const data = await listUserCommitmentLetters({
    page: 1,
    limit: 100,
    approvalStatus: "pending",
    managedByCoachId: actor.role === "admin" ? undefined : getStaffScopeCoachId(req),
  });

  return res.status(200).json({
    status: true,
    commitmentLetters: data.commitmentLetters,
    total: data.commitmentLetters.length,
  });
});

exports.getCoachCommitmentLetterByIdController = asyncHandler(async (req, res) => {
  const record = await getUserCommitmentLetterRecordById(readIdParam(req));
  if (!record) throw new AppError("Commitment letter not found", 404);
  assertStaffCanManageCommitmentLetter(req, record);

  const commitmentLetter = await getUserCommitmentLetterById(record.id);
  return res.status(200).json({ status: true, commitmentLetter });
});

exports.getCoachUserCommitmentLetterController = asyncHandler(async (req, res) => {
  const coachId = req.auth?.sub;
  if (!coachId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertStaffCanAccessUser(req, user);

  const commitmentLetter = await getLatestUserCommitmentLetterByUserId(userId);
  return res.status(200).json({
    status: true,
    commitmentLetter: commitmentLetter || null,
  });
});

exports.reviewCoachCommitmentLetterController = asyncHandler(async (req, res) => {
  const actor = assertStaffCanMutate(req);

  const id = readIdParam(req);
  const record = await getUserCommitmentLetterRecordById(id);
  if (!record) throw new AppError("Commitment letter not found", 404);
  assertStaffCanManageCommitmentLetter(req, record);

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
    reviewedByRole: actor.role,
    reviewedById: actor.id,
    rejectionReason: req.body.rejectionReason,
  });

  return res.status(200).json({
    status: true,
    message: action === "approved" ? "Commitment letter approved" : "Commitment letter rejected",
    commitmentLetter,
  });
});

exports.deleteCoachCommitmentLetterController = asyncHandler(async (req, res) => {
  assertStaffCanMutate(req);
  const id = readIdParam(req);
  const record = await getUserCommitmentLetterRecordById(id);
  if (!record) throw new AppError("Commitment letter not found", 404);
  assertStaffCanManageCommitmentLetter(req, record);

  await deleteUserCommitmentLetter(id);
  return res.status(200).json({
    status: true,
    message: "Commitment letter deleted successfully",
  });
});
