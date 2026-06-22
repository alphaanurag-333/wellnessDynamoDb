const { sendPushToTokens } = require("../utils/pushNotification");
const { readFcmToken } = require("../utils/parseFcmId");
const { resolveJobDate } = require("../utils/birthdayTimezone");
const { birthdayQueryMonthDays } = require("../utils/dobMonthDay");
const { listUsersWithBirthdayOnDate } = require("../models/userModel");
const {
  findBirthdayNotificationByUserAndDate,
  createBirthdayNotification,
  updateBirthdayNotification,
} = require("../models/birthdayNotificationModel");
const {
  findBirthdayPostByUserAndDate,
  createBirthdayPost,
} = require("../models/birthdayPostModel");

const PUSH_TITLE = "IR Wellness";
const DEFAULT_MESSAGE = "Happy Birthday! Wishing you a wonderful day from IR Wellness.";

async function deliverBirthdayPush(user, notification) {
  const token = readFcmToken(user);
  if (!token) {
    return { successCount: 0, failureCount: 0, skipped: true, reason: "no_token" };
  }

  return sendPushToTokens([token], {
    title: PUSH_TITLE,
    body: notification.message,
    data: {
      type: "birthday_notification",
      notificationId: notification.id || notification._id || "",
      userId: user.id || user._id || "",
    },
  });
}

async function ensureBirthdayPost(user, dateOnly, notificationId) {
  const userId = user.id || user._id;
  let post = await findBirthdayPostByUserAndDate(userId, dateOnly);
  if (!post) {
    post = await createBirthdayPost({
      userId,
      notificationId,
      postDate: dateOnly,
      message: `Happy Birthday, ${user.name || "friend"}!`,
      status: "active",
    });
  }
  return post;
}

async function sendBirthdayNotificationPush(user, notification) {
  let pushStatus = "failed";
  let sentAt = null;
  let push = { successCount: 0, failureCount: 0, skipped: true, reason: "no_token" };

  try {
    push = await deliverBirthdayPush(user, notification);
    if (push.successCount > 0) {
      pushStatus = "sent";
      sentAt = new Date().toISOString();
    }
  } catch (err) {
    console.error("Birthday push failed:", user.id || user._id, err?.message || err);
    push = { successCount: 0, failureCount: 0, skipped: true, reason: "send_error" };
  }

  const updated = await updateBirthdayNotification(notification.id, {
    status: pushStatus,
    sentAt,
  });

  return { pushStatus, push, notification: updated };
}

async function processBirthdayUser(user, dateOnly) {
  const userId = user.id || user._id;
  const existingNotification = await findBirthdayNotificationByUserAndDate(userId, dateOnly);

  if (existingNotification?.status === "sent") {
    const post = await ensureBirthdayPost(user, dateOnly, existingNotification.id);
    return {
      userId,
      userName: user.name || null,
      skipped: true,
      notificationId: existingNotification.id,
      notificationStatus: "sent",
      postId: post.id,
    };
  }

  let notification = existingNotification;
  const isRetry = Boolean(notification);

  if (!notification) {
    const message = DEFAULT_MESSAGE.replace("!", `, ${user.name || "friend"}!`);
    notification = await createBirthdayNotification({
      userId,
      notificationDate: dateOnly,
      message,
      status: "pending",
    });
  }

  const { pushStatus, push, notification: updated } = await sendBirthdayNotificationPush(
    user,
    notification
  );
  const post = await ensureBirthdayPost(user, dateOnly, updated.id);

  return {
    userId,
    userName: user.name || null,
    skipped: false,
    retried: isRetry,
    notificationId: updated.id,
    notificationStatus: pushStatus,
    postId: post.id,
    push,
  };
}

/**
 * Run the birthday job for one calendar day.
 * Defaults to today (BIRTHDAY_JOB_TIMEZONE). Matches users whose dob month-day equals that date.
 * Automatically sends push notifications to matched users.
 * @param {{ dateOnly?: string }} [options]
 */
async function runBirthdayJob(options = {}) {
  const jobDate = resolveJobDate(options.dateOnly);
  const monthDays = jobDate.monthDays || birthdayQueryMonthDays(jobDate.dateOnly);

  const users = await listUsersWithBirthdayOnDate(jobDate.dateOnly);
  const results = [];

  for (const user of users) {
    try {
      const result = await processBirthdayUser(user, jobDate.dateOnly);
      results.push(result);
    } catch (err) {
      console.error("Birthday job user failed:", user.id, err?.message || err);
      results.push({
        userId: user.id,
        userName: user.name || null,
        error: err?.message || "processing_failed",
      });
    }
  }

  const sent = results.filter((r) => r.notificationStatus === "sent" && !r.skipped).length;
  const retried = results.filter((r) => r.retried).length;
  const created = results.filter((r) => !r.skipped && !r.error && !r.retried).length;
  const skipped = results.filter((r) => r.skipped).length;
  const failed = results.filter((r) => r.error || r.notificationStatus === "failed").length;

  return {
    dateOnly: jobDate.dateOnly,
    timezone: jobDate.timezone,
    monthDays,
    matchedUsers: users.length,
    processed: results.length,
    sent,
    created,
    retried,
    skipped,
    failed,
    results,
  };
}

module.exports = {
  PUSH_TITLE,
  DEFAULT_MESSAGE,
  deliverBirthdayPush,
  sendBirthdayNotificationPush,
  processBirthdayUser,
  runBirthdayJob,
};
