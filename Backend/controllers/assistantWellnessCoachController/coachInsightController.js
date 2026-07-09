const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { readUserIdParam, loadTargetUser } = require("../healthProgressControllerHelpers");
const {
  getCoachInsightByUserId,
  upsertCoachInsight,
  deleteCoachInsight,
} = require("../../models/userCoachInsightModel");

async function assistantContext(req) {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);
  const userId = readUserIdParam(req);
  const user = await loadTargetUser(userId);
  if (String(user.assignedCoachId || "") !== String(assistantId)) {
    throw new AppError("User is not assigned to you", 403);
  }
  if (String(user.userTier || "").toLowerCase() !== "heal") {
    throw new AppError("Coach insight is only available for Heal users", 400);
  }
  return { userId, user, assistantId };
}

function mapValidationError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

exports.getAssistantUserCoachInsightController = asyncHandler(async (req, res) => {
  const { userId } = await assistantContext(req);
  const coachInsight = await getCoachInsightByUserId(userId);

  return res.status(200).json({
    status: true,
    message: "Coach insight fetched",
    coachInsight,
  });
});

exports.upsertAssistantUserCoachInsightController = asyncHandler(async (req, res) => {
  const { userId, assistantId } = await assistantContext(req);
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
      updatedByCoachId: assistantId,
      updatedByCoachType: "assistant_wellness_coach",
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
