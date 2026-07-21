const AppError = require("../../../utils/AppError");
const { asyncHandler } = require("../../../utils/asyncHandler");
const {
  getMealLogRecordById,
  reviewMealLog,
} = require("../../../models/mealTrackingModel");
const { getAdminById } = require("../../../models/adminModel");
const {
  dispatchMealLogReviewedNotification,
} = require("../../../services/notificationDispatchService");
const {
  readLogIdParam,
  handleValidationError,
} = require("../../mealTrackingControllerHelpers");

exports.adminReviewMealLogController = asyncHandler(async (req, res) => {
  const adminId = req.auth?.sub;
  if (!adminId) throw new AppError("Unauthorized", 401);

  const logId = readLogIdParam(req);
  const record = await getMealLogRecordById(logId);
  if (!record) throw new AppError("Meal log not found", 404);

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
      reviewedByRole: "admin",
      reviewedById: adminId,
    });
  } catch (err) {
    handleValidationError(err);
  }

  const admin = await getAdminById(adminId);
  dispatchMealLogReviewedNotification({
    userId: record.userId,
    status: nextStatus,
    coachName: admin?.name || "Admin",
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
