const { getUserById } = require("../models/userModel");
const { getWellnessCoachById } = require("../models/wellnessCoachModel");
const { getAssistantWellnessCoachById } = require("../models/assistantWellnessCoachModel");
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
  internal_parameters_recommendation: "internal_parameters_notification",
  internal_parameters_upload: "internal_parameters_upload_notification",
  diet_plan_assignment: "diet_plan_assignment_notification",
  coach_reminder: "reminder_notification",
  physical_exercise_assigned: "physical_exercise_notification",
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
    comment: notification.comment || "",
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
  comment = null,
}) {
  const notification = await createTargetedNotification({
    userId: recipientUserId,
    kind: "birthday_wish",
    message,
    referenceId: postId,
    referenceType: "birthday_post",
    actorUserId,
    title: "Birthday wish",
    comment,
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

async function dispatchInternalParametersRecommendationNotification({
  userId,
  recommendationId,
  coachName,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const message = `${name} has shared new internal parameter test recommendations.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "internal_parameters_recommendation",
    message,
    referenceId: recommendationId,
    referenceType: "coach_recommended_test",
    title: "New test recommendations",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchDietPlanAssignmentNotification({
  userId,
  assignmentId,
  coachName,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const message = `${name} has assigned a new diet plan for you.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "diet_plan_assignment",
    message,
    referenceId: assignmentId,
    referenceType: "coach_assigned_diet_plan",
    title: "New diet plan assigned",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchCoachReminderNotification({
  userId,
  reminderId,
  coachName,
  reminderName,
  actorUserId = null,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const label = String(reminderName || "Reminder").trim() || "Reminder";
  const message = `${name} added a reminder for you: ${label}.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "coach_reminder",
    message,
    referenceId: reminderId,
    referenceType: "reminder",
    actorUserId,
    title: "New reminder from your coach",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function collectCoachFcmTokensForUser(user) {
  const tokens = [];
  const parentCoachId = String(user?.parentCoachId || "").trim();
  const assignedCoachId = String(user?.assignedCoachId || "").trim();
  const assignedCoachType = String(user?.assignedCoachType || "").trim().toLowerCase();

  if (parentCoachId) {
    const coach = await getWellnessCoachById(parentCoachId);
    const token = readFcmToken(coach);
    if (token) tokens.push(token);
  }

  if (assignedCoachType === "assistant_wellness_coach" && assignedCoachId) {
    const assistant = await getAssistantWellnessCoachById(assignedCoachId);
    const token = readFcmToken(assistant);
    if (token) tokens.push(token);
  }

  return [...new Set(tokens)];
}

async function dispatchPhysicalExerciseAssignedNotification({
  userId,
  coachName,
  count = 1,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const n = Number(count) || 1;
  const message =
    n === 1
      ? `${name} assigned a new physical exercise for you.`
      : `${name} assigned ${n} new physical exercises for you.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "physical_exercise_assigned",
    message,
    referenceType: "assigned_physical_exercise",
    title: "New physical exercises",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchLabReportUploadCoachNotification({ user, reportId }) {
  const tokens = await collectCoachFcmTokensForUser(user);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }

  const userName = String(user?.name || "A user").trim() || "A user";
  const message = `${userName} uploaded a new lab report.`;

  const result = await sendPushToTokens(tokens, {
    title: "Lab report uploaded",
    body: message,
    data: {
      type: FCM_TYPE_BY_KIND.internal_parameters_upload,
      kind: "internal_parameters_upload",
      referenceId: String(reportId || ""),
      referenceType: "user_lab_report",
      userId: String(user?.id || user?._id || ""),
    },
  });

  return result;
}

function dispatchLabReportUploadCoachNotificationAsync(payload) {
  runPushSafely(dispatchLabReportUploadCoachNotification(payload));
}

module.exports = {
  dispatchBroadcastNotification,
  dispatchBirthdayWishNotification,
  ensureBirthdayReminderInbox,
  dispatchInternalParametersRecommendationNotification,
  dispatchDietPlanAssignmentNotification,
  dispatchCoachReminderNotification,
  dispatchPhysicalExerciseAssignedNotification,
  dispatchLabReportUploadCoachNotification,
  dispatchLabReportUploadCoachNotificationAsync,
  deliverBroadcastPush,
  deliverTargetedPush,
  FCM_TYPE_BY_KIND,
};
