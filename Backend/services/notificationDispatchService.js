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
const { sendWhatsAppText } = require("../utils/whatsapp");
const { resolveWhatsappNumber } = require("./meetingAssigneeService");
const {
  emitMealLogged,
  emitLabReportUploaded,
} = require("./adminActivityService");

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
  reminder_due: "reminder_due_notification",
  daily_reflection_reminder: "reminder_notification",
  physical_exercise_assigned: "physical_exercise_notification",
  mental_wellbeing_assigned: "mental_wellbeing_notification",
  yoga_assigned: "yoga_assigned_notification",
  supplement_recommended: "supplement_recommendation_notification",
  supplement_dosage_assigned: "supplement_dosage_notification",
  supplement_delivery_requested: "supplement_delivery_requested_notification",
  supplement_bill_uploaded: "supplement_bill_uploaded_notification",
  supplement_order_logged: "supplement_order_logged_notification",
  meal_log_submitted: "meal_log_submitted_notification",
  meal_log_reviewed: "meal_log_reviewed_notification",
  monthly_champion: "monthly_champion_notification",
  monthly_champion_comment: "monthly_champion_comment_notification",
  wellness_prescription_assignment: "wellness_prescription_assignment_notification",
  onboarding_slots_offered: "onboarding_slots_offered_notification",
  onboarding_reminder: "onboarding_reminder_notification",
  onboarding_meeting_confirmed: "onboarding_meeting_confirmed_notification",
  counselling_requested: "counselling_requested_notification",
  counselling_periods_offered: "counselling_periods_offered_notification",
  counselling_period_selected: "counselling_period_selected_notification",
  counselling_scheduled: "counselling_scheduled_notification",
  program_checkout_triggered: "program_checkout_triggered_notification",
  program_assigned: "program_assigned_notification",
  presentable_pic_request: "presentable_pic_request_notification",
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

async function dispatchMonthlyChampionNotification({
  userId,
  monthLabel,
  averageScore,
  postId,
}) {
  const message = `Congratulations! You are a Champion of ${monthLabel} with an average daily reflection score of ${averageScore}%.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "monthly_champion",
    message,
    referenceId: postId,
    referenceType: "monthly_champion_post",
    title: "🏆 Monthly Champion!",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchMonthlyChampionCommentNotification({
  recipientUserId,
  actorUserId,
  postId,
  message,
  comment = null,
}) {
  const notification = await createTargetedNotification({
    userId: recipientUserId,
    kind: "monthly_champion_comment",
    message,
    referenceId: postId,
    referenceType: "monthly_champion_post",
    actorUserId,
    title: "New comment on your Champion post",
    comment,
  });

  runPushSafely(deliverTargetedPush(recipientUserId, notification));
  return notification;
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

  let whatsapp = null;
  try {
    const user = await getUserById(userId);
    const wa = resolveWhatsappNumber(user);
    if (wa) {
      whatsapp = await sendWhatsAppText({
        toPhoneCountryCode: wa.phoneCountryCode,
        toPhone: wa.phone,
        message,
      });
    } else {
      whatsapp = { sent: false, reason: "missing_phone" };
    }
  } catch (err) {
    console.error(
      "Internal parameters WhatsApp notification failed:",
      err?.message || err
    );
    whatsapp = { sent: false, reason: err?.message || "send_failed" };
  }

  return { notification, whatsapp };
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

async function dispatchWellnessPrescriptionAssignedNotification({
  userId,
  assignmentId,
  coachName,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const message = `${name} has shared new wellness prescriptions for you.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "wellness_prescription_assignment",
    message,
    referenceId: assignmentId,
    referenceType: "coach_assigned_wellness_prescription",
    title: "New wellness prescriptions",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

function formatBedtimeLabel(value) {
  const raw = String(value || "22:30");
  const [h, m] = raw.split(":");
  const hour = Number(h);
  if (!Number.isFinite(hour)) return raw;
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 || 12;
  return `${display}:${m || "00"} ${suffix}`;
}

async function dispatchDailyReflectionBedtimeNotification({
  userId,
  bedtime,
  coachName,
  actorUserId = null,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const timeLabel = formatBedtimeLabel(bedtime);
  const message = `${name} sent a bedtime reminder. Your daily reflection form is ready — log tonight’s check-in around ${timeLabel}.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "daily_reflection_reminder",
    message,
    referenceType: "daily_reflection_bedtime",
    actorUserId,
    title: "Bedtime reminder",
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

/**
 * Inbox entry when a scheduled reminder fires (local push already shown — no FCM).
 * Dedupes once per reminder per calendar day via referenceId.
 */
async function ensureReminderDueInbox({
  userId,
  reminderId,
  reminderName,
  occurrenceDate = null,
}) {
  const uid = String(userId || "").trim();
  const rid = String(reminderId || "").trim();
  if (!uid || !rid) return null;

  const dateKey = String(
    occurrenceDate || new Date().toISOString().slice(0, 10)
  ).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return null;

  const referenceId = `${rid}:${dateKey}`;
  const existing = await findTargetedNotificationForUser(uid, {
    kind: "reminder_due",
    referenceId,
  });
  if (existing) return existing;

  const label = String(reminderName || "Reminder").trim() || "Reminder";
  return createTargetedNotification({
    userId: uid,
    kind: "reminder_due",
    message: `Time for ${label}`,
    referenceId,
    referenceType: "reminder",
    title: label,
  });
}

async function collectCoachFcmTokensForUser(user) {
  const tokens = [];
  const parentCoachId = String(user?.parentCoachId || "").trim();
  const assignedCoachId = String(user?.assignedCoachId || "").trim();
  const assignedCoachType = String(user?.assignedCoachType || "").trim().toLowerCase();

  const {
    getWellnessCoachByIdResolved,
    getAssistantWellnessCoachByIdResolved,
  } = require("./accountResolver");

  if (parentCoachId) {
    const coach =
      (await getWellnessCoachByIdResolved(parentCoachId)) ||
      (await getWellnessCoachById(parentCoachId));
    const token = readFcmToken(coach);
    if (token) tokens.push(token);
  }

  if (assignedCoachType === "assistant_wellness_coach" && assignedCoachId) {
    const assistant =
      (await getAssistantWellnessCoachByIdResolved(assignedCoachId)) ||
      (await getAssistantWellnessCoachById(assignedCoachId));
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

async function dispatchMentalWellbeingAssignedNotification({
  userId,
  coachName,
  count = 1,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const n = Number(count) || 1;
  const message =
    n === 1
      ? `${name} assigned new mental wellbeing content for you.`
      : `${name} assigned ${n} new mental wellbeing items for you.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "mental_wellbeing_assigned",
    message,
    referenceType: "assigned_mental_wellbeing",
    title: "New mental wellbeing content",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchWellnessYogaAssignedNotification({
  userId,
  coachName,
  count = 1,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const n = Number(count) || 1;
  const message =
    n === 1
      ? `${name} assigned new yoga content for you.`
      : `${name} assigned ${n} new yoga items for you.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "yoga_assigned",
    message,
    referenceType: "assigned_wellness_yoga",
    title: "New yoga content",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchLabReportUploadCoachNotification({ user, reportId }) {
  emitLabReportUploaded({ user, reportId });

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

async function dispatchMealLoggedCoachNotification({ user, mealLogId }) {
  emitMealLogged({ user, mealLogId });

  const tokens = await collectCoachFcmTokensForUser(user);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }

  const userName = String(user?.name || "A client").trim() || "A client";
  const message = `${userName} logged a new meal for review.`;

  return sendPushToTokens(tokens, {
    title: "New meal log",
    body: message,
    data: {
      type: FCM_TYPE_BY_KIND.meal_log_submitted,
      kind: "meal_log_submitted",
      referenceId: String(mealLogId || ""),
      referenceType: "meal_tracking",
      userId: String(user?.id || user?._id || ""),
    },
  });
}

function dispatchMealLoggedCoachNotificationAsync(payload) {
  runPushSafely(dispatchMealLoggedCoachNotification(payload));
}

async function dispatchSupplementRecommendedNotification({
  userId,
  coachName,
  recommendationId,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const message = `${name} shared new nutritions recommendations for you.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "supplement_recommended",
    message,
    referenceId: recommendationId ? String(recommendationId) : null,
    referenceType: "coach_recommended_supplement",
    title: "New nutritions recommendations",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchSupplementDosageAssignedNotification({
  userId,
  coachName,
  dosageId,
  supplementName,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const supplement = String(supplementName || "a nutrition").trim() || "a nutrition";
  const message = `${name} set a dosage schedule for ${supplement}.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "supplement_dosage_assigned",
    message,
    referenceId: dosageId ? String(dosageId) : null,
    referenceType: "user_supplement_dosage",
    title: "New nutrition dosage",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchSupplementOrderLoggedNotification({
  userId,
  coachName,
  recommendationId,
  orderId,
  vendor,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const source = String(vendor || "").trim();
  const message = source
    ? `${name} placed your nutritions order with ${source}.`
    : `${name} placed your nutritions order.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "supplement_order_logged",
    message,
    referenceId: orderId ? String(orderId) : recommendationId ? String(recommendationId) : null,
    referenceType: "coach_supplement_fulfilment_order",
    title: "Nutritions order placed",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchSupplementDeliveryRequestedCoachNotification({ user, recommendationId }) {
  const tokens = await collectCoachFcmTokensForUser(user);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }

  const userName = String(user?.name || "A user").trim() || "A user";
  const message = `${userName} requested nutritions delivery.`;

  return sendPushToTokens(tokens, {
    title: "Nutritions delivery requested",
    body: message,
    data: {
      type: FCM_TYPE_BY_KIND.supplement_delivery_requested,
      kind: "supplement_delivery_requested",
      referenceId: String(recommendationId || ""),
      referenceType: "coach_recommended_supplement",
      userId: String(user?.id || user?._id || ""),
    },
  });
}

function dispatchSupplementDeliveryRequestedCoachNotificationAsync(payload) {
  runPushSafely(dispatchSupplementDeliveryRequestedCoachNotification(payload));
}

async function dispatchSupplementBillUploadedCoachNotification({ user, recommendationId }) {
  const tokens = await collectCoachFcmTokensForUser(user);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }

  const userName = String(user?.name || "A user").trim() || "A user";
  const message = `${userName} uploaded a nutrition bill.`;

  return sendPushToTokens(tokens, {
    title: "Nutrition bill uploaded",
    body: message,
    data: {
      type: FCM_TYPE_BY_KIND.supplement_bill_uploaded,
      kind: "supplement_bill_uploaded",
      referenceId: String(recommendationId || ""),
      referenceType: "coach_recommended_supplement",
      userId: String(user?.id || user?._id || ""),
    },
  });
}

function dispatchSupplementBillUploadedCoachNotificationAsync(payload) {
  runPushSafely(dispatchSupplementBillUploadedCoachNotification(payload));
}

async function dispatchMealLogReviewedNotification({
  userId,
  status,
  coachName,
  mealLogId,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const nextStatus = String(status || "").trim().toLowerCase();
  const approved = nextStatus === "approved";
  const message = approved
    ? `${name} approved your meal log.`
    : `${name} rejected your meal log.`;

  const notification = await createTargetedNotification({
    userId,
    kind: "meal_log_reviewed",
    message,
    referenceId: mealLogId ? String(mealLogId) : null,
    referenceType: "meal_tracking",
    title: approved ? "Meal log approved" : "Meal log rejected",
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

const ONBOARDING_MEETING_TITLES = {
  launch: "LAUNCH",
  reportsBriefing: "Reports Briefing",
  hap: "HAP",
  programInitiation: "Program Initiation",
};

async function dispatchOnboardingReminderNotification({
  userId,
  message,
  stepLabel = "",
  actorUserId = null,
}) {
  const body = String(message || "").trim();
  const label = String(stepLabel || "").trim();
  const title = label ? `Reminder: ${label}` : "Onboarding reminder";

  const notification = await createTargetedNotification({
    userId,
    kind: "onboarding_reminder",
    message: body,
    referenceType: "onboarding_step",
    actorUserId,
    title,
  });

  const push = await deliverTargetedPush(userId, notification);
  return { notification, push };
}

async function dispatchOnboardingSlotsOfferedNotification({ userId, stepKey, meetingId }) {
  const label = ONBOARDING_MEETING_TITLES[stepKey] || "onboarding";
  const notification = await createTargetedNotification({
    userId,
    kind: "onboarding_slots_offered",
    message: `Your coach offered time slots for your ${label} meeting.`,
    referenceId: meetingId ? String(meetingId) : null,
    referenceType: "onboarding_meeting",
    title: "New meeting slots",
  });
  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchProgramCheckoutTriggeredNotification({
  userId,
  programName,
  transactionId,
  reminder = false,
  actorUserId = null,
}) {
  const name = String(programName || "Wellness Program").trim() || "Wellness Program";
  const notification = await createTargetedNotification({
    userId,
    kind: "program_checkout_triggered",
    message: reminder
      ? `Reminder: complete payment for ${name} in the app.`
      : `Your coach shared ${name} for payment. Complete it in the app.`,
    referenceId: transactionId ? String(transactionId) : null,
    referenceType: "coach_checkout",
    actorUserId,
    title: reminder ? "Payment reminder" : "Program payment ready",
  });
  const push = await deliverTargetedPush(userId, notification);
  return { notification, push };
}

async function dispatchProgramAssignedNotification({ userId, programTitle, programId }) {
  const title = String(programTitle || "Wellness Program").trim() || "Wellness Program";
  const notification = await createTargetedNotification({
    userId,
    kind: "program_assigned",
    message: `Your coach assigned ${title} to you. Open the app to view it.`,
    referenceId: programId ? String(programId) : null,
    referenceType: "user_program",
    title: "Program assigned",
  });
  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchPresentablePicRequestNotification({
  userId,
  photoType,
  coachName,
  actorUserId = null,
}) {
  const name = String(coachName || "Your coach").trim() || "Your coach";
  const type = String(photoType || "presentable photo").trim() || "presentable photo";
  const notification = await createTargetedNotification({
    userId,
    kind: "presentable_pic_request",
    message: `${name} requested a new photo: ${type}. Please upload it in Personal Details.`,
    referenceType: "presentable_pic",
    actorUserId,
    title: "Photo requested",
    comment: type,
  });

  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchOnboardingMeetingConfirmedNotification({ userId, stepKey }) {
  const label = ONBOARDING_MEETING_TITLES[stepKey] || "onboarding";
  const notification = await createTargetedNotification({
    userId,
    kind: "onboarding_meeting_confirmed",
    message: `Your ${label} meeting is confirmed. Join using the Zoom link in the app.`,
    referenceType: "onboarding_meeting",
    title: "Meeting confirmed",
  });
  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchOnboardingTimeRequestedCoachNotification({ user, stepKey }) {
  const tokens = await collectCoachFcmTokensForUser(user);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }
  const userName = String(user?.name || "A client").trim() || "A client";
  const label = ONBOARDING_MEETING_TITLES[stepKey] || "onboarding";
  return sendPushToTokens(tokens, {
    title: "Time requested",
    body: `${userName} requested another time for ${label}.`,
    data: {
      type: "onboarding_time_requested_notification",
      kind: "onboarding_time_requested",
      referenceType: "onboarding_meeting",
      userId: String(user?.id || user?._id || ""),
    },
  });
}

function dispatchOnboardingSlotsOfferedNotificationAsync(payload) {
  dispatchOnboardingSlotsOfferedNotification(payload).catch((err) => {
    console.error("Onboarding slots notification failed:", err?.message || err);
  });
}

function dispatchProgramCheckoutTriggeredNotificationAsync(payload) {
  dispatchProgramCheckoutTriggeredNotification(payload).catch((err) => {
    console.error("Program checkout notification failed:", err?.message || err);
  });
}

function dispatchProgramAssignedNotificationAsync(payload) {
  dispatchProgramAssignedNotification(payload).catch((err) => {
    console.error("Program assigned notification failed:", err?.message || err);
  });
}

function dispatchOnboardingMeetingConfirmedNotificationAsync(payload) {
  runPushSafely(dispatchOnboardingMeetingConfirmedNotification(payload));
}

function dispatchOnboardingTimeRequestedCoachNotificationAsync(payload) {
  runPushSafely(dispatchOnboardingTimeRequestedCoachNotification(payload));
}

async function dispatchCounsellingCoachPush({ user, title, body, kind, trackId }) {
  const tokens = await collectCoachFcmTokensForUser(user);
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_tokens" };
  }
  return sendPushToTokens(tokens, {
    title,
    body,
    data: {
      type: FCM_TYPE_BY_KIND[kind] || `${kind}_notification`,
      kind,
      referenceType: "heal_consultancy_track",
      referenceId: trackId ? String(trackId) : "",
      userId: String(user?.id || user?._id || ""),
    },
  });
}

async function dispatchCounsellingRequestedCoachNotification({ user, trackId }) {
  const userName = String(user?.name || "A client").trim() || "A client";
  return dispatchCounsellingCoachPush({
    user,
    title: "Counselling requested",
    body: `${userName} requested a counselling session.`,
    kind: "counselling_requested",
    trackId,
  });
}

async function dispatchCounsellingPeriodSelectedCoachNotification({ user, trackId }) {
  const userName = String(user?.name || "A client").trim() || "A client";
  return dispatchCounsellingCoachPush({
    user,
    title: "Period selected",
    body: `${userName} selected a time period for counselling.`,
    kind: "counselling_period_selected",
    trackId,
  });
}

async function dispatchCounsellingPeriodsOfferedNotification({ userId, trackId }) {
  const notification = await createTargetedNotification({
    userId,
    kind: "counselling_periods_offered",
    message: "Your coach shared available dates and time periods for your counselling session.",
    referenceId: trackId ? String(trackId) : null,
    referenceType: "heal_consultancy_track",
    title: "Counselling availability",
  });
  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

async function dispatchCounsellingScheduledNotification({ userId, trackId }) {
  const notification = await createTargetedNotification({
    userId,
    kind: "counselling_scheduled",
    message: "Your counselling session time is confirmed. Join using the Zoom link in the app.",
    referenceId: trackId ? String(trackId) : null,
    referenceType: "heal_consultancy_track",
    title: "Counselling confirmed",
  });
  runPushSafely(deliverTargetedPush(userId, notification));
  return notification;
}

function dispatchCounsellingRequestedCoachNotificationAsync(payload) {
  runPushSafely(dispatchCounsellingRequestedCoachNotification(payload));
}

function dispatchCounsellingPeriodSelectedCoachNotificationAsync(payload) {
  runPushSafely(dispatchCounsellingPeriodSelectedCoachNotification(payload));
}

function dispatchCounsellingPeriodsOfferedNotificationAsync(payload) {
  dispatchCounsellingPeriodsOfferedNotification(payload).catch((err) => {
    console.error("Counselling periods offered notification failed:", err?.message || err);
  });
}

function dispatchCounsellingScheduledNotificationAsync(payload) {
  dispatchCounsellingScheduledNotification(payload).catch((err) => {
    console.error("Counselling scheduled notification failed:", err?.message || err);
  });
}

module.exports = {
  dispatchBroadcastNotification,
  dispatchBirthdayWishNotification,
  ensureBirthdayReminderInbox,
  dispatchMonthlyChampionNotification,
  dispatchMonthlyChampionCommentNotification,
  dispatchInternalParametersRecommendationNotification,
  dispatchDietPlanAssignmentNotification,
  dispatchWellnessPrescriptionAssignedNotification,
  dispatchCoachReminderNotification,
  ensureReminderDueInbox,
  dispatchDailyReflectionBedtimeNotification,
  dispatchPhysicalExerciseAssignedNotification,
  dispatchMentalWellbeingAssignedNotification,
  dispatchWellnessYogaAssignedNotification,
  dispatchSupplementRecommendedNotification,
  dispatchSupplementDosageAssignedNotification,
  dispatchSupplementOrderLoggedNotification,
  dispatchSupplementDeliveryRequestedCoachNotification,
  dispatchSupplementDeliveryRequestedCoachNotificationAsync,
  dispatchSupplementBillUploadedCoachNotification,
  dispatchSupplementBillUploadedCoachNotificationAsync,
  dispatchLabReportUploadCoachNotification,
  dispatchLabReportUploadCoachNotificationAsync,
  dispatchMealLoggedCoachNotification,
  dispatchMealLoggedCoachNotificationAsync,
  dispatchMealLogReviewedNotification,
  dispatchOnboardingReminderNotification,
  dispatchOnboardingSlotsOfferedNotification,
  dispatchOnboardingSlotsOfferedNotificationAsync,
  dispatchProgramCheckoutTriggeredNotification,
  dispatchProgramCheckoutTriggeredNotificationAsync,
  dispatchProgramAssignedNotification,
  dispatchProgramAssignedNotificationAsync,
  dispatchPresentablePicRequestNotification,
  dispatchOnboardingMeetingConfirmedNotification,
  dispatchOnboardingMeetingConfirmedNotificationAsync,
  dispatchOnboardingTimeRequestedCoachNotification,
  dispatchOnboardingTimeRequestedCoachNotificationAsync,
  dispatchCounsellingRequestedCoachNotification,
  dispatchCounsellingRequestedCoachNotificationAsync,
  dispatchCounsellingPeriodSelectedCoachNotification,
  dispatchCounsellingPeriodSelectedCoachNotificationAsync,
  dispatchCounsellingPeriodsOfferedNotification,
  dispatchCounsellingPeriodsOfferedNotificationAsync,
  dispatchCounsellingScheduledNotification,
  dispatchCounsellingScheduledNotificationAsync,
  deliverBroadcastPush,
  deliverTargetedPush,
  FCM_TYPE_BY_KIND,
};
