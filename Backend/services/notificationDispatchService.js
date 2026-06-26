const { getUserById } = require("../models/userModel");
const {
  createNotification,
  createTargetedNotification,
  findTargetedNotificationForUser,
} = require("../models/notificationModel");
const { collectFcmTokensForAudience } = require("../utils/fcmAudience");
const { sendPushToTokens } = require("../utils/pushNotification");
const { readFcmToken } = require("../utils/parseFcmId");
const { resolvePublicUrl } = require("../utils/s3");

const PUSH_TITLE_DEFAULT = "IR Wellness";

const FCM_TYPE_BY_KIND = {
  admin_broadcast: "admin_notification",
  health_tool: "health_tool_notification",
  recipe: "recipe_notification",
  yoga: "yoga_notification",
  birthday_wish: "birthday_wish_notification",
  birthday_reminder: "birthday_notification",
};

function buildPushData(notification) {
  const kind = notification.kind || "admin_broadcast";
  return {
    notificationId: notification.id || notification._id || "",
    type: FCM_TYPE_BY_KIND[kind] || "admin_notification",
    kind,
    referenceId: notification.referenceId || "",
    referenceType: notification.referenceType || "",
    actorUserId: notification.actorUserId || "",
    audienceType: notification.audienceType || "",
  };
}

async function deliverBroadcastPush(notification) {
  if (!notification || notification.status !== "active") {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "inactive" };
  }

  const tokens = await collectFcmTokensForAudience(notification.audienceType || "users");
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }

  const imageUrl = notification.image ? resolvePublicUrl(notification.image) : null;
  return sendPushToTokens(tokens, {
    title: notification.title || PUSH_TITLE_DEFAULT,
    body: notification.message,
    imageUrl,
    data: buildPushData(notification),
  });
}

async function deliverTargetedPush(userId, notification) {
  const user = await getUserById(userId);
  const token = user ? readFcmToken(user) : null;
  if (!token) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_token" };
  }

  const imageUrl = notification.image ? resolvePublicUrl(notification.image) : null;
  return sendPushToTokens([token], {
    title: notification.title || PUSH_TITLE_DEFAULT,
    body: notification.message,
    imageUrl,
    data: buildPushData(notification),
  });
}

function runPushSafely(promise) {
  promise.catch((err) => {
    console.error("FCM push failed:", err?.message || err);
  });
}

async function dispatchBroadcastNotification({
  kind,
  message,
  image = "",
  title = null,
  referenceId = null,
  referenceType = null,
}) {
  const notification = await createNotification({
    audienceType: "users",
    message,
    image,
    status: "active",
    kind,
    title,
    referenceId,
    referenceType,
  });

  runPushSafely(deliverBroadcastPush(notification));
  return notification;
}

async function dispatchBirthdayWishNotification({
  recipientUserId,
  actorUserId,
  postId,
  message,
}) {
  const notification = await createTargetedNotification({
    userId: recipientUserId,
    kind: "birthday_wish",
    message,
    referenceId: postId,
    referenceType: "birthday_post",
    actorUserId,
    title: "Birthday wish",
  });

  runPushSafely(deliverTargetedPush(recipientUserId, notification));
  return notification;
}

/**
 * Creates a user-inbox entry for the automated birthday job (no duplicate push).
 */
async function ensureBirthdayReminderInbox({
  recipientUserId,
  message,
  postId,
}) {
  const uid = String(recipientUserId || "").trim();
  const pid = String(postId || "").trim();
  if (!uid || !pid) return null;

  const existing = await findTargetedNotificationForUser(uid, {
    kind: "birthday_reminder",
    referenceId: pid,
  });
  if (existing) return existing;

  return createTargetedNotification({
    userId: uid,
    kind: "birthday_reminder",
    message: String(message || "").trim(),
    referenceId: pid,
    referenceType: "birthday_post",
    title: "Happy Birthday!",
  });
}

module.exports = {
  dispatchBroadcastNotification,
  dispatchBirthdayWishNotification,
  ensureBirthdayReminderInbox,
  deliverBroadcastPush,
  deliverTargetedPush,
  FCM_TYPE_BY_KIND,
};
