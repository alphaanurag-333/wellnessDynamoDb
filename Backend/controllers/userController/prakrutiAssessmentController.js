const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { PRAKRUTI_TYPE_LABELS } = require("../../utils/prakrutiConstants");
const {
  getLatestUserPrakrutiAssessmentByUserId,
  enrichAssessmentPublic,
} = require("../../models/userPrakrutiAssessmentModel");

function readUserId(req) {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);
  return userId;
}

/** GET /user/prakruti-assessment — current prakruti type, things to avoid, recommendations */
exports.getMyPrakrutiAssessmentController = asyncHandler(async (req, res) => {
  const userId = readUserId(req);
  const raw = await getLatestUserPrakrutiAssessmentByUserId(userId);
  const assessment = raw ? await enrichAssessmentPublic(raw) : null;

  return res.status(200).json({
    status: true,
    message: assessment ? "Prakruti assessment fetched successfully" : "No Prakruti assessment yet",
    prakrutiType: assessment?.prakrutiType ?? null,
    prakrutiTypeLabel: assessment?.prakrutiType ? PRAKRUTI_TYPE_LABELS[assessment.prakrutiType] : null,
    thingsToAvoid: assessment?.thingsToAvoid ?? [],
    thingsToAvoidTitles: assessment?.thingsToAvoidTitles ?? [],
    recommendations: assessment?.recommendations ?? [],
    recommendationTitles: assessment?.recommendationTitles ?? [],
    assessment,
  });
});
