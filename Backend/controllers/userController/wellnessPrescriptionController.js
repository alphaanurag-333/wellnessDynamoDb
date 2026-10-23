const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById } = require("../../models/userModel");
const {
  loadCoachMeetingSnapshot,
} = require("../../services/wellnessPrescriptionReviewService");
const { buildUserCounsellingReviewHistory } = require("../../utils/counsellingReviewHistory");

function mapPrescriptionListResponse(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  return {
    assignments: list,
    recommended: list[0] || null,
    history: list.length > 1 ? list.slice(1) : [],
  };
}

exports.getUserWellnessPrescriptionsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  const snapshot = await loadCoachMeetingSnapshot(userId, user);

  return res.status(200).json({
    status: true,
    message: "Wellness prescriptions fetched successfully",
    ...mapPrescriptionListResponse(snapshot.assignments),
    meetings: snapshot.meetings,
    lastReviewedAt: snapshot.lastReviewedAt,
  });
});

exports.getUserReviewHistoryController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);

  const user = await getUserById(userId);
  const snapshot = await loadCoachMeetingSnapshot(userId, user);
  const history = buildUserCounsellingReviewHistory({
    assignments: snapshot.assignments,
    meetings: snapshot.meetings,
    tracks: snapshot.tracks,
    initiatorContext: snapshot.initiatorContext,
  });

  return res.status(200).json({
    status: true,
    message: "Review history fetched successfully",
    reviews: history.reviews.sort((a, b) =>
      String(b.date || "").localeCompare(String(a.date || "")),
    ),
    meetings: history.meetings,
    sessions: history.sessions,
    lastReviewedAt: snapshot.lastReviewedAt,
  });
});
