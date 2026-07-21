const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  getLatestUserCommitmentLetterByUserId,
} = require("../../../models/userCommitmentLetterModel");
const {
  loadTargetUser,
  assertAdminCanAccessUser,
  readUserIdParam,
} = require("../../reminderControllerHelpers");

exports.getAdminUserCommitmentLetterController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);

  const commitmentLetter = await getLatestUserCommitmentLetterByUserId(userId);
  return res.status(200).json({
    status: true,
    commitmentLetter: commitmentLetter || null,
  });
});
