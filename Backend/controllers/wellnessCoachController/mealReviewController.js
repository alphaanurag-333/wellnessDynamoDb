const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getMealLogRecordById,
  toMealLogPublic,
  reviewMealLog,
  queryMealLogsByCoachId,
} = require("../../models/mealTrackingModel");
const { getUserById } = require("../../models/userModel");
const { getWellnessCoachById } = require("../../models/wellnessCoachModel");
const { handleValidationError } = require("../mealTrackingControllerHelpers");
const {
  dispatchMealLogReviewedNotification,
} = require("../../services/notificationDispatchService");

function readLogIdParam(req) {
  return String(req.params.logId || req.params.id || "").trim();
}

async function enrichPendingLogs(logs) {
  const userCache = new Map();
  const enriched = [];

  for (const log of logs) {
    const uid = String(log.userId || "").trim();
    let userName = "Client";
    if (uid) {
      if (!userCache.has(uid)) {
        const user = await getUserById(uid);
        userCache.set(uid, user?.name || "Client");
      }
      userName = userCache.get(uid);
    }
    enriched.push({
      ...toMealLogPublic(log),
      userName,
    });
  }

  return enriched;
}

exports.listPendingMealLogsController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const rawLogs = await queryMealLogsByCoachId(actingCoachId, {
    status: "pending_review",
  });
  const logs = await enrichPendingLogs(rawLogs);

  return res.status(200).json({
    status: true,
    message: "Pending meal logs fetched successfully",
    logs,
    total: logs.length,
  });
});

exports.reviewMealLogController = asyncHandler(async (req, res) => {
  const actingCoachId = req.auth?.sub;
  if (!actingCoachId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  const record = await getMealLogRecordById(logId);
  if (!record) throw new AppError("Meal log not found", 404);

  if (String(record.coachId || "") !== String(actingCoachId)) {
    throw new AppError("Meal log is not under your coaching hierarchy", 403);
  }

  if (String(record.status || "") !== "pending_review") {
    throw new AppError("Meal log is not pending review", 400);
  }

  const nextStatus = String(req.body?.status || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(nextStatus)) {
    throw new AppError("status must be approved or rejected", 400);
  }

  let mealLog;
  try {
    mealLog = await reviewMealLog(logId, {
      status: nextStatus,
      proteinGm: req.body?.proteinGm,
      fatsGm: req.body?.fatsGm,
      carbsGm: req.body?.carbsGm,
      caloriesKcal: req.body?.caloriesKcal,
      rejectionReason: req.body?.rejectionReason,
      reviewedByRole: "wellness_coach",
      reviewedById: actingCoachId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const coach = await getWellnessCoachById(actingCoachId);
  const coachName = coach?.name || "Your coach";

  dispatchMealLogReviewedNotification({
    userId: record.userId,
    status: nextStatus,
    coachName,
    mealLogId: logId,
  }).catch((err) => {
    console.error("Meal review notification failed:", err?.message || err);
  });

  return res.status(200).json({
    status: true,
    message:
      nextStatus === "approved"
        ? "Meal log approved successfully"
        : "Meal log rejected successfully",
    mealLog,
  });
});
