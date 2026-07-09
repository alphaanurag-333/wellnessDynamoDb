const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { normalizeMediaField, resolvePublicUrl } = require("../utils/s3");
const {
  listByPartitionKey,
  appendFilter,
  sortBySentAtDesc,
  paginateItems,
  filterItemsBySearch,
  DEFAULT_STATUS_PARTITIONS,
} = require("../utils/dynamoList");
const { getReadMapForUser } = require("./userNotificationReadModel");
const { getUserById } = require("./userModel");

const TABLE = "Notification";
const STATUS = new Set(["active", "inactive"]);
const AUDIENCE_TYPES = new Set(["users"]);
const KIND = new Set([
  "admin_broadcast",
  "health_tool",
  "recipe",
  "yoga",
  "birthday_wish",
  "birthday_reminder",
  "internal_parameters_recommendation",
  "internal_parameters_upload",
  "coach_reminder",
  "physical_exercise_assigned",
  "meal_log_reviewed",
  "monthly_champion",
  "monthly_champion_comment",
]);
const BROADCAST_KINDS = new Set(["admin_broadcast", "health_tool", "recipe", "yoga"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeAudienceType(value, fallback = "users") {
  const next = String(value || fallback).trim().toLowerCase();
  return AUDIENCE_TYPES.has(next) ? next : fallback;
}

function normalizeKind(value, fallback = "admin_broadcast") {
  const next = String(value || fallback).trim().toLowerCase();
  return KIND.has(next) ? next : fallback;
}

function isSupportedAudience(value) {
  return AUDIENCE_TYPES.has(String(value || "").trim().toLowerCase());
}

function isBroadcastNotification(item) {
  if (!item) return false;
  const kind = normalizeKind(item.kind, "admin_broadcast");
  return BROADCAST_KINDS.has(kind) && isSupportedAudience(item.audienceType);
}

function isSentOnOrAfterUserJoined(notification, userCreatedAt) {
  const joinedAt = String(userCreatedAt || "").trim();
  if (!joinedAt) return true;

  const sentAt = String(notification?.sentAt || notification?.createdAt || "").trim();
  if (!sentAt) return false;

  return sentAt >= joinedAt;
}

function isNotificationVisibleToUser(item, userId, userCreatedAt = null) {
  if (!item || normalizeStatus(item.status) !== "active") return false;
  if (isBroadcastNotification(item)) {
    return isSentOnOrAfterUserJoined(item, userCreatedAt);
  }
  return String(item.userId || "").trim() === String(userId || "").trim();
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicNotification(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  if (row.image) row.image = resolvePublicUrl(row.image);
  return row;
}

function toUserInboxNotification(item, readMap) {
  const row = toPublicNotification(item);
  if (!row) return null;
  const readAt = readMap?.get(row.id) || null;
  return {
    id: row.id,
    _id: row._id,
    kind: normalizeKind(row.kind, "admin_broadcast"),
    message: row.message,
    title: row.title || null,
    image: row.image || null,
    referenceId: row.referenceId || null,
    referenceType: row.referenceType || null,
    actorUserId: row.actorUserId || null,
    comment: row.comment || null,
    sentAt: row.sentAt,
    createdAt: row.createdAt,
    isRead: Boolean(readAt),
    readAt,
  };
}

async function createNotification({
  audienceType,
  message,
  image = "",
  status = "active",
  kind = "admin_broadcast",
  userId = null,
  referenceId = null,
  referenceType = null,
  actorUserId = null,
  title = null,
}) {
  const now = new Date().toISOString();
  const normalizedKind = normalizeKind(kind);
  const item = {
    id: uuidv4(),
    kind: normalizedKind,
    audienceType: normalizeAudienceType(audienceType),
    message: String(message || "").trim(),
    image: image ? normalizeMediaField(image, "image") : "",
    status: normalizeStatus(status),
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (title) item.title = String(title).trim();
  if (referenceId) item.referenceId = String(referenceId).trim();
  if (referenceType) item.referenceType = String(referenceType).trim();
  if (actorUserId) item.actorUserId = String(actorUserId).trim();

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return toPublicNotification(item);
}

async function createTargetedNotification({
  userId,
  kind,
  message,
  referenceId = null,
  referenceType = null,
  actorUserId = null,
  title = null,
  image = "",
  comment = null,
}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("userId is required");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    kind: normalizeKind(kind),
    userId: uid,
    message: String(message || "").trim(),
    image: image ? normalizeMediaField(image, "image") : "",
    status: "active",
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  if (title) item.title = String(title).trim();
  if (referenceId) item.referenceId = String(referenceId).trim();
  if (referenceType) item.referenceType = String(referenceType).trim();
  if (actorUserId) item.actorUserId = String(actorUserId).trim();
  if (comment) item.comment = String(comment).trim();

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return toPublicNotification(item);
}

async function getNotificationRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getNotificationById(id) {
  const item = await getNotificationRecordById(id);
  if (!item) return null;
  if (item.userId) return toPublicNotification(item);
  if (!isSupportedAudience(item.audienceType)) return null;
  return toPublicNotification(item);
}

async function updateNotification(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    const n = `#${key}`;
    const v = `:${key}`;
    exprNames[n] = key;
    exprValues[v] = key === "image" ? normalizeMediaField(value, "image") : value;
    setExpr += `, ${n} = ${v}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicNotification(Attributes || null);
}

async function deleteNotification(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listNotifications({ page = 1, limit = 10, status, audienceType, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedAudience = audienceType ? normalizeAudienceType(audienceType, "") : "";
  if (audienceType && !normalizedAudience) {
    return {
      notifications: [],
      pagination: { page: Math.max(1, Number(page) || 1), limit, total: 0, pages: 1 },
    };
  }
  const searchTerm = String(search || "").trim();
  const searching = Boolean(searchTerm);
  let filterExpression;
  const exprNames = {};
  const exprValues = {};

  const useAudienceIndex = Boolean(normalizedAudience);
  const indexName = useAudienceIndex ? "AudienceSentAtIndex" : "StatusSentAtIndex";
  const partitionKeyName = useAudienceIndex ? "audienceType" : "status";
  const partitionKeyValue = useAudienceIndex
    ? normalizedAudience
    : normalizedStatus || undefined;

  if (normalizedStatus && partitionKeyName !== "status") {
    exprNames["#status"] = "status";
    exprValues[":status"] = normalizedStatus;
    filterExpression = appendFilter(filterExpression, "#status = :status");
  }

  if (!useAudienceIndex) {
    exprNames["#audienceType"] = "audienceType";
    exprValues[":usersOnly"] = "users";
    filterExpression = appendFilter(filterExpression, "#audienceType = :usersOnly");
  }

  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
    statusPartitions: !normalizedAudience && !normalizedStatus ? DEFAULT_STATUS_PARTITIONS : undefined,
    filterExpression,
    exprNames,
    exprValues,
    scanIndexForward: false,
    page: searching ? 1 : page,
    limit: searching ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: searching ? Number.MAX_SAFE_INTEGER : 200,
    sortFn: sortBySentAtDesc,
  });

  if (!searching) {
    return {
      notifications: result.items.map((row) => toPublicNotification(row)),
      pagination: result.pagination,
    };
  }

  const filtered = filterItemsBySearch(result.items, {
    search: searchTerm,
    searchFn: (item, term) => String(item.message || "").toLowerCase().includes(term),
  });
  const paged = paginateItems(filtered, page, limit, 200);

  return {
    notifications: paged.items.map((row) => toPublicNotification(row)),
    pagination: paged.pagination,
  };
}

async function queryAllBroadcastNotifications() {
  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "AudienceSentAtIndex",
        KeyConditionExpression: "#audienceType = :audienceType",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#audienceType": "audienceType",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":audienceType": "users",
          ":status": "active",
        },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      if (isBroadcastNotification(item)) items.push(item);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function queryTargetedNotificationsForUser(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserSentAtIndex",
        KeyConditionExpression: "#userId = :userId",
        FilterExpression: "#status = :status",
        ExpressionAttributeNames: {
          "#userId": "userId",
          "#status": "status",
        },
        ExpressionAttributeValues: {
          ":userId": uid,
          ":status": "active",
        },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function findTargetedNotificationForUser(userId, { kind, referenceId }) {
  const uid = String(userId || "").trim();
  const refId = String(referenceId || "").trim();
  const normalizedKind = normalizeKind(kind, "");
  if (!uid || !refId || !normalizedKind) return null;

  const items = await queryTargetedNotificationsForUser(uid);
  return (
    items.find(
      (item) =>
        normalizeKind(item.kind) === normalizedKind &&
        String(item.referenceId || "").trim() === refId
    ) || null
  );
}

async function listApplicableNotificationsForUser(userId) {
  const uid = String(userId || "").trim();
  const user = uid ? await getUserById(uid) : null;
  const userCreatedAt = user?.createdAt || null;

  const [broadcast, targeted] = await Promise.all([
    queryAllBroadcastNotifications(),
    queryTargetedNotificationsForUser(uid),
  ]);

  const applicableBroadcasts = broadcast.filter((item) =>
    isSentOnOrAfterUserJoined(item, userCreatedAt)
  );

  const merged = [...applicableBroadcasts, ...targeted];
  merged.sort(sortBySentAtDesc);
  return merged;
}

async function listNotificationsForUser(userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));

  let items = await listApplicableNotificationsForUser(userId);
  const readMap = await getReadMapForUser(
    userId,
    items.map((item) => item.id)
  );

  if (unreadOnly) {
    items = items.filter((item) => !readMap.has(item.id));
  }

  const total = items.length;
  const skip = (safePage - 1) * safeLimit;
  const pageItems = items.slice(skip, skip + safeLimit);

  return {
    notifications: pageItems
      .map((item) => toUserInboxNotification(item, readMap))
      .filter(Boolean),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

async function countUnreadNotificationsForUser(userId) {
  const items = await listApplicableNotificationsForUser(userId);
  const readMap = await getReadMapForUser(
    userId,
    items.map((item) => item.id)
  );
  return items.filter((item) => !readMap.has(item.id)).length;
}

async function getNotificationForUser(userId, notificationId) {
  const uid = String(userId || "").trim();
  const item = await getNotificationRecordById(notificationId);
  const user = uid ? await getUserById(uid) : null;
  if (!isNotificationVisibleToUser(item, uid, user?.createdAt || null)) return null;

  const readMap = await getReadMapForUser(uid, [notificationId]);
  return toUserInboxNotification(item, readMap);
}

async function listNotificationIdsForUser(userId) {
  const items = await listApplicableNotificationsForUser(userId);
  return items.map((item) => item.id);
}

module.exports = {
  createNotification,
  createTargetedNotification,
  getNotificationById,
  getNotificationRecordById,
  getNotificationForUser,
  updateNotification,
  deleteNotification,
  listNotifications,
  listNotificationsForUser,
  listNotificationIdsForUser,
  countUnreadNotificationsForUser,
  findTargetedNotificationForUser,
  normalizeStatus,
  normalizeAudienceType,
  normalizeKind,
  isSupportedAudience,
  isNotificationVisibleToUser,
};
