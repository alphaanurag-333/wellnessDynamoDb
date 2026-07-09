const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  readUserIdParam,
  loadTargetUser,
  assertCoachCanAccessUser,
  assertHealTierUser,
} = require("../healthProgressControllerHelpers");
const {
  getCoachInsightByUserId,
  upsertCoachInsight,
  deleteCoachInsight,
} = require("../../models/userCoachInsightModel");

async function coachContext(req) {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  await assertCoachCanAccessUser(user, actingCoachId);
  assertHealTierUser(user);
  return { userId, user, actingCoachId };
}

function mapValidationError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

exports.getCoachUserCoachInsightController = asyncHandler(async (req, res) => {
  const { userId } = await coachContext(req);
  const coachInsight = await getCoachInsightByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Coach insight fetched",
    coachInsight,
  });
});

exports.upsertCoachUserCoachInsightController = asyncHandler(async (req, res) => {
  const { userId, actingCoachId } = await coachContext(req);
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
      updatedByCoachId: actingCoachId,
      updatedByCoachType: "wellness_coach",
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
