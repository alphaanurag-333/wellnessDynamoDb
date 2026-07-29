const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  getMealLogRecordById,
  reviewMealLog,
  queryMealLogsByCoachId,
  toMealLogPublic,
} = require("../../../models/mealTrackingModel");
const { getAdminById } = require("../../../models/adminModel");
const { getUserById } = require("../../../models/userModel");
const { getWellnessCoachById } = require("../../../models/wellnessCoachModel");
const { getAssistantWellnessCoachRecordById } = require("../../../models/assistantWellnessCoachModel");
const {
  dispatchMealLogReviewedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readLogIdParam,
  handleValidationError,
} = require("../../mealTrackingControllerHelpers");
const { assertCanAccessClient } = require("../../../utils/clientOwnership");

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

function resolveReviewCoachId(auth) {
  if (auth?.accountType === "wellness_coach") return auth.sub;
  if (auth?.accountType === "assistant_wellness_coach") {
    return auth.parentCoachId || auth.wellnessCoachId || null;
  }
  return null;
}

exports.adminListPendingMealLogsController = asyncHandler(async (req, res) => {
  const accountType = req.auth?.accountType || "admin";
  let coachId = resolveReviewCoachId(req.auth);

  if (accountType === "admin") {
    coachId = String(req.query.coachId || "").trim() || null;
    if (!coachId) {
      return res.status(200).json({
        status: true,
        message: "Pending meal logs fetched successfully",
        logs: [],
        total: 0,
        hint: "Pass coachId to list pending reviews for a coach hierarchy",
      });
    }
  }

  if (!coachId) throw new AppError("Unauthorized", 401);

  const rawLogs = await queryMealLogsByCoachId(coachId, { status: "pending_review" });
  let logs = await enrichPendingLogs(rawLogs);

  if (accountType === "assistant_wellness_coach") {
    const filtered = [];
    for (const log of logs) {
      try {
        await assertCanAccessClient(req.auth, log.userId);
        filtered.push(log);
      } catch {
        /* skip */
      }
    }
    logs = filtered;
  }

  return res.status(200).json({
    status: true,
    message: "Pending meal logs fetched successfully",
    logs,
    total: logs.length,
  });
});

exports.adminReviewMealLogController = asyncHandler(async (req, res) => {
  const reviewerId = req.auth?.sub;
  if (!reviewerId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  const record = await getMealLogRecordById(logId);
  if (!record) throw new AppError("Meal log not found", 404);

  await assertCanAccessClient(req.auth, record.userId);

  if (String(record.status || "") !== "pending_review") {
    throw new AppError("Meal log is not pending review", 400);
  }

  const nextStatus = String(req.body?.status || "").trim().toLowerCase();
  if (!["approved", "rejected"].includes(nextStatus)) {
    throw new AppError("status must be approved or rejected", 400);
  }

  const accountType = req.auth?.accountType || "admin";
  let mealLog;
  try {
    mealLog = await reviewMealLog(logId, {
      status: nextStatus,
      proteinGm: req.body?.proteinGm,
      fatsGm: req.body?.fatsGm,
      carbsGm: req.body?.carbsGm,
      caloriesKcal: req.body?.caloriesKcal,
      rejectionReason: req.body?.rejectionReason,
      reviewedByRole: accountType,
      reviewedById: reviewerId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  let reviewerName = "Admin";
  if (accountType === "admin") {
    const admin = await getAdminById(reviewerId);
    reviewerName = admin?.name || "Admin";
  } else if (accountType === "wellness_coach") {
    const coach = await getWellnessCoachById(reviewerId);
    reviewerName = coach?.name || "Your coach";
  } else {
    const assistant = await getAssistantWellnessCoachRecordById(reviewerId);
    reviewerName = assistant?.name || "Your coach";
  }

  dispatchMealLogReviewedNotification({
    userId: record.userId,
    status: nextStatus,
    coachName: reviewerName,
    mealLogId: logId,
  }).catch((err) => {
    console.error("Meal review notification failed:", err?.message || err);
  });

  return res.status(200).json({
    status: true,
    message: nextStatus === "approved" ? "Meal log approved" : "Meal log rejected",
    mealLog,
  });
});
