const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { getUserById, updateUser } = require("../../models/userModel");
const { buildLaunchStepCompletionUpdates } = require("../../utils/paidOnboardingHelpers");
const {
  listUserLaunchAssessmentsByUserId,
  getUserLaunchAssessmentByUserAndDate,
  normalizeAssessmentDate,
  SCORE_MIN,
  SCORE_MAX,
} = require("../../models/userLaunchAssessmentModel");

const LAUNCH_SCORE_ZONES = [
  { min: 0, max: 150, label: "Needs attention", color: "#ef4444" },
  { min: 151, max: 300, label: "Below average", color: "#f97316" },
  { min: 301, max: 450, label: "Average", color: "#eab308" },
  { min: 451, max: 600, label: "Good", color: "#84cc16" },
  { min: 601, max: 750, label: "Excellent", color: "#16a34a" },
];

const LAUNCH_MAX_REFERENCE_SCORE = 750;

function getScoreZone(score) {
  const n = Number(score) || 0;
  return LAUNCH_SCORE_ZONES.find((zone) => n >= zone.min && n <= zone.max) || LAUNCH_SCORE_ZONES[0];
}

function toHistoryItem(assessment) {
  return {
    id: assessment.id,
    _id: assessment._id,
    assessmentDate: assessment.assessmentDate,
    totalScore: assessment.totalScore,
    zone: getScoreZone(assessment.totalScore),
    areasToFocus: assessment.areasToFocus || [],
    focusAreas: assessment.focusAreas || [],
  };
}

function handleLaunchValidationError(err) {
  if (err?.name === "ValidationError") throw new AppError(err.message, 400);
  throw err;
}

function readUserId(req) {
  const userId = req.auth?.sub || req.user?.id;
  if (!userId) throw new AppError("Unauthorized", 401);
  return userId;
}

/** GET /user/launch-assessment/scores — score history + latest assessment summary */
exports.getMyLaunchScoresController = asyncHandler(async (req, res) => {
  const userId = readUserId(req);
  const assessments = await listUserLaunchAssessmentsByUserId(userId);

  if (assessments.length) {
    const user = await getUserById(userId);
    if (user) {
      const updates = buildLaunchStepCompletionUpdates(user.paidOnboardingStepStatus);
      if (updates) await updateUser(userId, updates);
    }
  }

  const sorted = [...assessments].sort((a, b) =>
    String(b.assessmentDate || "").localeCompare(String(a.assessmentDate || ""))
  );
  const latest = sorted[0] || null;
  const history = [...assessments]
    .sort((a, b) => String(a.assessmentDate || "").localeCompare(String(b.assessmentDate || "")))
    .map(toHistoryItem);

  return res.status(200).json({
    status: true,
    message: "LAUNCH scores fetched successfully",
    currentScore: latest?.totalScore ?? null,
    zone: latest ? getScoreZone(latest.totalScore) : null,
    areasToFocus: latest?.areasToFocus ?? [],
    focusAreas: latest?.focusAreas ?? [],
    latest: latest ? toHistoryItem(latest) : null,
    history,
    scoreRange: { min: SCORE_MIN, max: SCORE_MAX },
    maxReferenceScore: LAUNCH_MAX_REFERENCE_SCORE,
    zones: LAUNCH_SCORE_ZONES,
  });
});

/** GET /user/launch-assessment/by-date?date=YYYY-MM-DD — full assessment for one date */
exports.getMyLaunchAssessmentByDateController = asyncHandler(async (req, res) => {
  const userId = readUserId(req);
  const assessmentDate = String(req.query.date || "").trim();
  if (!assessmentDate) throw new AppError("date query parameter is required", 400);

  let assessment;
  try {
    assessment = await getUserLaunchAssessmentByUserAndDate(userId, assessmentDate);
  } catch (err) {
    handleLaunchValidationError(err);
  }

  return res.status(200).json({
    status: true,
    message: assessment ? "LAUNCH assessment fetched successfully" : "No assessment for this date",
    assessment: assessment
      ? {
          ...assessment,
          zone: getScoreZone(assessment.totalScore),
        }
      : null,
    maxReferenceScore: LAUNCH_MAX_REFERENCE_SCORE,
    zones: LAUNCH_SCORE_ZONES,
  });
});

/** GET /user/launch-assessment/:assessmentId — single assessment by id */
exports.getMyLaunchAssessmentByIdController = asyncHandler(async (req, res) => {
  const userId = readUserId(req);
  const assessmentId = String(req.params.assessmentId || "").trim();
  if (!assessmentId) throw new AppError("assessmentId is required", 400);

  const assessments = await listUserLaunchAssessmentsByUserId(userId);
  const assessment = assessments.find((row) => String(row.id) === assessmentId);
  if (!assessment) throw new AppError("LAUNCH assessment not found", 404);

  return res.status(200).json({
    status: true,
    message: "LAUNCH assessment fetched successfully",
    assessment: {
      ...assessment,
      zone: getScoreZone(assessment.totalScore),
    },
    maxReferenceScore: LAUNCH_MAX_REFERENCE_SCORE,
    zones: LAUNCH_SCORE_ZONES,
  });
});

module.exports.normalizeAssessmentDate = normalizeAssessmentDate;
