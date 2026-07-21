const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  readUserIdParam,
  loadTargetUser,
  assertAdminCanAccessUser,
  assertHealTierUser,
} = require("../../healthProgressControllerHelpers");
const {
  getCoachInsightByUserId,
  upsertCoachInsight,
  deleteCoachInsight,
} = require("../../../models/userCoachInsightModel");

async function adminContext(req) {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertAdminCanAccessUser(user, adminId);
  assertHealTierUser(user);
  return { userId, user, adminId };
}

function mapValidationError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

exports.getAdminUserCoachInsightController = asyncHandler(async (req, res) => {
  const { userId } = await adminContext(req);
  const coachInsight = await getCoachInsightByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Coach insight fetched",
    coachInsight,
  });
});

exports.upsertAdminUserCoachInsightController = asyncHandler(async (req, res) => {
  const { userId, adminId } = await adminContext(req);
  const rawMessage = req.body?.message;

  if (rawMessage == null) {
    throw new AppError("message is required", 400);
  }

  const trimmed = String(rawMessage).trim();
  if (!trimmed) {
    await deleteCoachInsight(userId);
    return res.status(200).json({
      status: true,
      message: "Coach insight cleared",
      coachInsight: null,
    });
  }

  let coachInsight;
  try {
    coachInsight = await upsertCoachInsight(userId, {
      message: trimmed,
      updatedByCoachId: adminId,
      updatedByCoachType: "admin",
    });
  } catch (err) {
    mapValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: "Coach insight saved",
    coachInsight,
  });
});
