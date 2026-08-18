const AppError = require("../../utils/AppError");
const { asyncHandler } = require("../../utils/asyncHandler");
const { listStaffClientIdSet } = require("../staffAccess");
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

function isActivityVisible(activity, subjectUserIds) {
  if (!(subjectUserIds instanceof Set)) return true;
  const uid = String(activity?.subjectUserId || "").trim();
  return Boolean(uid && subjectUserIds.has(uid));
}

exports.listAdminInboxController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const { page, limit } = readPaging(req.query);
  const unreadOnly = String(req.query.unread || "").trim().toLowerCase() === "true";
  const subjectUserIds = await listStaffClientIdSet(req);

  const data = await listAdminActivities({
    page,
    limit,
    unreadOnly,
    accountId,
    subjectUserIds,
  });

  return res.status(200).json({
    status: true,
    notifications: data.notifications,
    pagination: data.pagination,
  });
});

exports.getAdminInboxUnreadCountController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const subjectUserIds = await listStaffClientIdSet(req);
  const unreadCount = await countUnreadAdminActivities(accountId, subjectUserIds);

  return res.status(200).json({
    status: true,
    unreadCount,
  });
});

exports.markAdminInboxItemReadController = asyncHandler(async (req, res) => {
  const accountId = resolveAccountId(req);
  if (!accountId) throw new AppError("Unauthorized", 401);

  const activity = await getAdminActivityById(req.params.id);
  const subjectUserIds = await listStaffClientIdSet(req);
  if (!activity || activity.status !== "active" || !isActivityVisible(activity, subjectUserIds)) {
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

  const subjectUserIds = await listStaffClientIdSet(req);
  const activityIds = await listAdminActivityIds({ limit: 200, subjectUserIds });
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
  const subjectUserIds = await listStaffClientIdSet(req);
  if (!activity || activity.status !== "active" || !isActivityVisible(activity, subjectUserIds)) {
    throw new AppError("Notification not found", 404);
  }

  const readMap = await getReadMapForAccount(accountId, [activity.id]);

  return res.status(200).json({
    status: true,
    notification: toInboxItem(activity, readMap),
  });
});
