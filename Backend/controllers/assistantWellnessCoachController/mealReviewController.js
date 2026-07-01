const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getMealLogRecordById,
  toMealLogPublic,
  reviewMealLog,
  queryMealLogsByCoachId,
} = require("../../models/mealTrackingModel");
const { getUserById } = require("../../models/userModel");
const { getAssistantWellnessCoachById } = require("../../models/assistantWellnessCoachModel");
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
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const parentCoachId = String(req.user?.wellnessCoachId || "").trim();
  if (!parentCoachId) throw new AppError("Assistant coach hierarchy not found", 403);

  const rawLogs = await queryMealLogsByCoachId(parentCoachId, {
    status: "pending_review",
  });

  const filtered = rawLogs.filter(
    (log) =>
      String(log.assignedCoachType || "") === "assistant_wellness_coach" &&
      String(log.assignedCoachId || "") === String(assistantId)
  );

  const logs = await enrichPendingLogs(filtered);

  return res.status(200).json({
    status: true,
    message: "Pending meal logs fetched successfully",
    logs,
    total: logs.length,
  });
});

exports.reviewMealLogController = asyncHandler(async (req, res) => {
  const assistantId = req.auth?.sub;
  if (!assistantId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  const record = await getMealLogRecordById(logId);
  if (!record) throw new AppError("Meal log not found", 404);

  if (
    String(record.assignedCoachType || "") !== "assistant_wellness_coach" ||
    String(record.assignedCoachId || "") !== String(assistantId)
  ) {
    throw new AppError("Meal log is not assigned to you", 403);
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
      reviewedByRole: "assistant_wellness_coach",
      reviewedById: assistantId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const assistant = await getAssistantWellnessCoachById(assistantId);
  const coachName = assistant?.name || "Your coach";

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
