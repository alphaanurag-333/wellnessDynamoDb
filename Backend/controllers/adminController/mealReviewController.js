const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  getMealLogRecordById,
  toMealLogPublic,
  reviewMealLog,
  queryMealLogsByCoachId,
  queryPendingMealLogs,
} = require("../../models/mealTrackingModel");
const { getUserById } = require("../../models/userModel");
const { handleValidationError } = require("../helpers/mealTrackingControllerHelpers");
const {
  dispatchMealLogReviewedNotification,
} = require("../../services/notificationDispatchService");
const {
  resolveStaffActor,
  getStaffScopeCoachId,
  assertStaffCanMutate,
} = require("../staffAccess");

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

function assertCanReviewMealLog(actor, record) {
  if (actor.role === "admin") return;
  if (actor.role === "wellness_coach" || actor.role === "trainee") {
    const coachId = actor.role === "trainee" ? actor.parentCoachId : actor.id;
    if (String(record.coachId || "") !== String(coachId)) {
      throw new AppError("Meal log is not under your coaching hierarchy", 403);
    }
    return;
  }
  if (actor.role === "assistant_wellness_coach") {
    if (
      String(record.assignedCoachType || "") !== "assistant_wellness_coach" ||
      String(record.assignedCoachId || "") !== String(actor.id)
    ) {
      throw new AppError("Meal log is not assigned to you", 403);
    }
    return;
  }
  throw new AppError("Forbidden", 403);
}

exports.listPendingMealLogsController = asyncHandler(async (req, res) => {
  const actor = resolveStaffActor(req);
  let rawLogs = [];

  if (actor.role === "admin") {
    rawLogs = await queryPendingMealLogs({ limit: 200 });
  } else {
    const coachId = getStaffScopeCoachId(req);
    if (!coachId) throw new AppError("Coach hierarchy not found", 403);
    rawLogs = await queryMealLogsByCoachId(coachId, { status: "pending_review" });
    if (actor.role === "assistant_wellness_coach") {
      rawLogs = rawLogs.filter(
        (log) =>
          String(log.assignedCoachType || "") === "assistant_wellness_coach" &&
          String(log.assignedCoachId || "") === String(actor.id)
      );
    }
  }

  const logs = await enrichPendingLogs(rawLogs);

  return res.status(200).json({
    status: true,
    message: "Pending meal logs fetched successfully",
    logs,
    total: logs.length,
  });
});

exports.reviewMealLogController = asyncHandler(async (req, res) => {
  const actor = assertStaffCanMutate(req);

  const logId = readLogIdParam(req);
  const record = await getMealLogRecordById(logId);
  if (!record) throw new AppError("Meal log not found", 404);

  assertCanReviewMealLog(actor, record);

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
      reviewedByRole: actor.role,
      reviewedById: actor.id,
    });
  } catch (err) {
    handleValidationError(err);
  }

  dispatchMealLogReviewedNotification({
    userId: record.userId,
    status: nextStatus,
    coachName: actor.displayName || "Your coach",
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
