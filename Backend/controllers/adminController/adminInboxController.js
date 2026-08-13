const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const {
  listAdminActivities,
  listAdminActivityIds,
  getAdminActivityById,
  countUnreadAdminActivities,
  toInboxItem,
} = require("../../models/adminActivityModel");
const {
  markActivityRead,
  markAllActivitiesRead,
  getReadMapForAccount,
} = require("../../models/adminActivityReadModel");

function readPaging(query, defaultLimit = 30) {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || defaultLimit));
  return { page, limit };
}

function resolveAccountId(req) {
  return (
    req.auth?.sub ||
    req.account?.id ||
    req.user?.id ||
    req.user?._id ||
    null
  );
}

exports.listAdminInboxController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const { page, limit } = readPaging(req.query);
  const unreadOnly = String(req.query.unread || "").trim().toLowerCase() === "true";

  const data = await listAdminActivities({ page, limit, unreadOnly, accountId });

  return res.status(200).json({
    status: true,
    notifications: data.notifications,
    pagination: data.pagination,
  });
});

exports.getAdminInboxUnreadCountController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const unreadCount = await countUnreadAdminActivities(accountId);

  return res.status(200).json({
    status: true,
    unreadCount,
  });
});

exports.markAdminInboxItemReadController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const activity = await getAdminActivityById(req.params.id);
  if (!activity || activity.status !== "active") {
    throw new AppError("Notification not found", 404);
  }

  const readRecord = await markActivityRead(accountId, activity.id);
  const readMap = new Map([[activity.id, readRecord.readAt]]);

  return res.status(200).json({
    status: true,
    message: "Notification marked as read",
    notification: toInboxItem(activity, readMap),
  });
});

exports.markAllAdminInboxReadController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const activityIds = await listAdminActivityIds({ limit: 200 });
  await markAllActivitiesRead(accountId, activityIds);

  return res.status(200).json({
    status: true,
    message: "All notifications marked as read",
    markedCount: activityIds.length,
  });
});

exports.getAdminInboxItemController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const activity = await getAdminActivityById(req.params.id);
  if (!activity || activity.status !== "active") {
    throw new AppError("Notification not found", 404);
  }

  const readMap = await getReadMapForAccount(accountId, [activity.id]);

  return res.status(200).json({
    status: true,
    notification: toInboxItem(activity, readMap),
  });
});
