const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listNotificationsForUser,
  getNotificationForUser,
  listNotificationIdsForUser,
  countUnreadNotificationsForUser,
} = require("../../models/notificationModel");
const {
  markNotificationRead,
  markAllNotificationsRead,
} = require("../../models/userNotificationReadModel");

function readPaging(query, defaultLimit = 20) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit };
}

exports.listMyNotificationsController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const { page, limit } = readPaging(req.query);
  const unreadOnly = String(req.query.unread || "").trim().toLowerCase() === "true";

  const data = await listNotificationsForUser(userId, { page, limit, unreadOnly });

  return res.status(200).json({
    status: true,
    notifications: data.notifications,
    pagination: data.pagination,
  });
});

exports.getMyUnreadCountController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const unreadCount = await countUnreadNotificationsForUser(userId);

  return res.status(200).json({
    status: true,
    unreadCount,
  });
});

exports.getMyNotificationByIdController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const notification = await getNotificationForUser(userId, req.params.id);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  return res.status(200).json({
    status: true,
    notification,
  });
});

exports.markNotificationReadController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const notification = await getNotificationForUser(userId, req.params.id);
  if (!notification) {
    throw new AppError("Notification not found", 404);
  }

  const readRecord = await markNotificationRead(userId, req.params.id);

  return res.status(200).json({
    status: true,
    message: "Notification marked as read",
    notification: {
      ...notification,
      isRead: true,
      readAt: readRecord.readAt,
    },
  });
});

exports.markAllNotificationsReadController = asyncHandler(async (req, res) => {
  const userId = req.auth?.sub || req.user?.id;
  const notificationIds = await listNotificationIdsForUser(userId);
  await markAllNotificationsRead(userId, notificationIds);

  return res.status(200).json({
    status: true,
    message: "All notifications marked as read",
    markedCount: notificationIds.length,
  });
});
