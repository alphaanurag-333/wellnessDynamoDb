const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listBirthdayNotifications,
  getBirthdayNotificationById,
  updateBirthdayNotification,
} = require("../../models/birthdayNotificationModel");
const { getUserById, toPublicUser } = require("../../models/userModel");
const {
  deliverBirthdayPush,
  runBirthdayJob,
} = require("../../services/birthdayJobService");
const { findBirthdayPostByUserAndDate } = require("../../models/birthdayPostModel");
const { ensureBirthdayReminderInbox } = require("../../services/notificationDispatchService");

function resendResultMessage(push) {
  if (push.reason === "no_token") return "User has no FCM token registered";
  if (push.skipped) return "Push was not sent";
  return `Birthday notification resent (${push.successCount} delivered, ${push.failureCount} failed)`;
}

exports.listBirthdayNotificationsController = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status, notificationDate, search } = req.query;
  const data = await listBirthdayNotifications({
    page,
    limit,
    status,
    notificationDate,
    search,
  });

  const userIds = [...new Set(data.birthdayNotifications.map((row) => row.userId).filter(Boolean))];
  const userMap = new Map();
  await Promise.all(
    userIds.map(async (userId) => {
      const user = await getUserById(userId);
      if (user) userMap.set(userId, toPublicUser(user));
    })
  );

  const birthdayNotifications = data.birthdayNotifications.map((row) => ({
    ...row,
    user: userMap.get(row.userId) || null,
  }));

  return res.status(200).json({
    status: true,
    birthdayNotifications,
    pagination: data.pagination,
  });
});

exports.getBirthdayNotificationByIdController = asyncHandler(async (req, res) => {
  const notification = await getBirthdayNotificationById(req.params.id);
  if (!notification) {
    throw new AppError("Birthday notification not found", 404);
  }

  const user = await getUserById(notification.userId);
  return res.status(200).json({
    status: true,
    birthdayNotification: notification,
    user: user ? toPublicUser(user) : null,
  });
});

exports.resendBirthdayNotificationController = asyncHandler(async (req, res) => {
  const notification = await getBirthdayNotificationById(req.params.id);
  if (!notification) {
    throw new AppError("Birthday notification not found", 404);
  }

  const user = await getUserById(notification.userId);
  if (!user) {
    throw new AppError("Birthday user not found", 404);
  }

  const push = await deliverBirthdayPush(user, notification);

  let pushStatus = "failed";
  let sentAt = null;
  if (push.successCount > 0) {
    pushStatus = "sent";
    sentAt = new Date().toISOString();
  }

  const updated = await updateBirthdayNotification(notification.id, {
    status: pushStatus,
    sentAt,
  });

  const post = await findBirthdayPostByUserAndDate(
    notification.userId,
    notification.notificationDate
  );
  if (post) {
    await ensureBirthdayReminderInbox({
      recipientUserId: notification.userId,
      message: updated.message,
      postId: post.id || post._id,
    });
  }

  return res.status(200).json({
    status: true,
    message: resendResultMessage(push),
    birthdayNotification: updated,
    push,
  });
});

exports.runBirthdayJobController = asyncHandler(async (req, res) => {
  const dateOnly = req.body?.dateOnly ?? req.query?.dateOnly;

  try {
    const result = await runBirthdayJob(
      dateOnly != null && String(dateOnly).trim() !== "" ? { dateOnly: String(dateOnly).trim() } : {}
    );
    return res.status(200).json({
      status: true,
      message: `Birthday job completed for ${result.dateOnly} (${result.matchedUsers} user(s) matched by dob)`,
      ...result,
    });
  } catch (err) {
    if (err?.name === "ValidationError") {
      throw new AppError(err.message, 400);
    }
    throw err;
  }
});
