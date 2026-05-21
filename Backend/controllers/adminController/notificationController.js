const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  uploadFileFromRequest,
  deleteStoredMedia,
  parseMediaKeyFromBody,
} = require("../../utils/s3");
const {
  createNotification,
  getNotificationById,
  getNotificationRecordById,
  updateNotification,
  deleteNotification,
  listNotifications,
  normalizeStatus,
  normalizeAudienceType,
} = require("../../models/notificationModel");
const { collectFcmTokensForAudience } = require("../../utils/fcmAudience");
const { sendPushToTokens } = require("../../utils/pushNotification");
const { resolvePublicUrl } = require("../../utils/s3");

const S3_FOLDER = "notification";
const PUSH_TITLE = "IR Wellness";

async function deliverNotificationPush(notification) {
  if (!notification || notification.status !== "active") {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "inactive" };
  }

  const tokens = await collectFcmTokensForAudience(notification.audienceType);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }

  const imageUrl = notification.image ? resolvePublicUrl(notification.image) : null;
  return sendPushToTokens(tokens, {
    title: PUSH_TITLE,
    body: notification.message,
    imageUrl,
    data: {
      notificationId: notification.id || notification._id || "",
      audienceType: notification.audienceType,
      type: "admin_notification",
    },
  });
}

async function runNotificationPush(notification) {
  try {
    return await deliverNotificationPush(notification);
  } catch (err) {
    console.error("FCM push failed:", err?.message || err);
    return { successCount: 0, failureCount: 0, skipped: true, reason: "send_error" };
  }
}

function resendResultMessage(push) {
  if (push.reason === "inactive") return "Notification is inactive";
  if (push.reason === "no_tokens") return "No devices registered for this audience";
  if (push.reason === "firebase_unavailable") return push.detail || "Push service unavailable";
  if (push.reason === "send_error") return "Push delivery failed";
  if (push.skipped) return "Push was not sent";
  return `Notification resent (${push.successCount} delivered, ${push.failureCount} failed)`;
}

exports.listNotificationsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, audienceType, search } = req.query;
  const data = await listNotifications({ page, limit, status, audienceType, search });
  return res.status(200).json({
    status: true,
    notifications: data.notifications,
    pagination: data.pagination,
  });
});

exports.getNotificationByIdController = asyncHandler(async (req, res) => {
  const notification = await getNotificationById(req.params.id);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }
  return res.status(200).json({ status: true, notification });
});

exports.createNotificationController = asyncHandler(async (req, res) => {
  const audienceType = normalizeAudienceType(req.body.audienceType, "");
  const message = String(req.body.message || "").trim();
  const status = normalizeStatus(req.body.status, "active");
  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  const image = uploadedKey ?? (req.body.image !== undefined ? parseMediaKeyFromBody(req.body.image, "image") : "");

  if (!audienceType) {
    throw new AppError("audienceType is required", 400);
  }
  if (!["users", "coaches"].includes(audienceType)) {
    throw new AppError("audienceType must be users or coaches", 400);
  }
  if (!message) {
    throw new AppError("message is required", 400);
  }
  if (message.length > 1000) {
    throw new AppError("message cannot exceed 1000 characters", 400);
  }

  const notification = await createNotification({ audienceType, message, image, status });

  const push =
    status === "active"
      ? await runNotificationPush(notification)
      : { successCount: 0, failureCount: 0, skipped: true, reason: "inactive" };

  return res.status(201).json({
    status: true,
    message: "Notification created successfully",
    notification,
    push,
  });
});

exports.updateNotificationController = asyncHandler(async (req, res) => {
  const current = await getNotificationRecordById(req.params.id);
  if (!current) {
    throw new AppError("Notification not found", 404);
  }

  const updates = {};

  if (req.body.audienceType !== undefined) {
    const audienceType = normalizeAudienceType(req.body.audienceType, "");
    if (!["users", "coaches"].includes(audienceType)) {
      throw new AppError("audienceType must be users or coaches", 400);
    }
    updates.audienceType = audienceType;
  }

  if (req.body.message !== undefined) {
    const message = String(req.body.message).trim();
    if (!message) throw new AppError("message cannot be empty", 400);
    if (message.length > 1000) throw new AppError("message cannot exceed 1000 characters", 400);
    updates.message = message;
  }

  if (req.body.status !== undefined) {
    const status = String(req.body.status).trim().toLowerCase();
    if (!["active", "inactive"].includes(status)) {
      throw new AppError("status must be active or inactive", 400);
    }
    updates.status = status;
  }

  if (req.body.image !== undefined) {
    updates.image = parseMediaKeyFromBody(req.body.image, "image") ?? "";
  }

  const uploadedKey = await uploadFileFromRequest(req, S3_FOLDER);
  if (uploadedKey) {
    if (current.image) await deleteStoredMedia(current.image);
    updates.image = uploadedKey;
  }

  if (Object.keys(updates).length === 0) {
    throw new AppError("At least one field is required for update", 400);
  }

  let notification;
  try {
    notification = await updateNotification(req.params.id, updates);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Notification not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Notification updated successfully",
    notification,
  });
});

/** POST /admin/notifications/:id/resend — resend push to audience */
exports.resendNotificationController = asyncHandler(async (req, res) => {
  const notification = await getNotificationById(req.params.id);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }
  if (notification.status !== "active") {
    throw new AppError("Only active notifications can be resent", 400);
  }

  const push = await runNotificationPush(notification);

  let updated = notification;
  try {
    updated = await updateNotification(req.params.id, {
      sentAt: new Date().toISOString(),
    });
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Notification not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: resendResultMessage(push),
    notification: updated,
    push,
  });
});

exports.deleteNotificationController = asyncHandler(async (req, res) => {
  const current = await getNotificationRecordById(req.params.id);
  if (!current) {
    throw new AppError("Notification not found", 404);
  }

  if (current.image) await deleteStoredMedia(current.image);

  try {
    await deleteNotification(req.params.id);
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") {
      throw new AppError("Notification not found", 404);
    }
    throw err;
  }

  return res.status(200).json({
    status: true,
    message: "Notification deleted successfully",
  });
});
