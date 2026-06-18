const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { normalizeMediaField, resolvePublicUrl } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortBySentAtDesc,
  DEFAULT_STATUS_PARTITIONS,
} = require("../utils/dynamoList");

const TABLE = "Notification";
const STATUS = new Set(["active", "inactive"]);
const AUDIENCE_TYPES = new Set(["users", "coaches"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeAudienceType(value, fallback = "users") {
  const next = String(value || fallback).trim().toLowerCase();
  return AUDIENCE_TYPES.has(next) ? next : fallback;
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

async function createNotification({ audienceType, message, image = "", status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    audienceType: normalizeAudienceType(audienceType),
    message: String(message || "").trim(),
    image: image ? normalizeMediaField(image, "image") : "",
    status: normalizeStatus(status),
    sentAt: now,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

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
  return item ? toPublicNotification(item) : null;
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

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
  }));

  return toPublicNotification(Attributes || null);
}

async function deleteNotification(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listNotifications({ page = 1, limit = 10, status, audienceType, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedAudience = audienceType ? normalizeAudienceType(audienceType, "") : "";
  const searchFilter = buildContainsFilter(["message"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedStatus) {
    exprNames["#status"] = "status";
    exprValues[":status"] = normalizedStatus;
    filterExpression = appendFilter(filterExpression, "#status = :status");
  }

  const indexName = normalizedAudience ? "AudienceSentAtIndex" : "StatusSentAtIndex";
  const partitionKeyName = normalizedAudience ? "audienceType" : "status";
  const partitionKeyValue = normalizedAudience || normalizedStatus || undefined;

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
    statusPartitions: !normalizedAudience && !normalizedStatus ? DEFAULT_STATUS_PARTITIONS : undefined,
    filterExpression,
    exprNames,
    exprValues,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortBySentAtDesc,
  });

  return {
    notifications: items.map((row) => toPublicNotification(row)),
    pagination,
  };
}

module.exports = {
  createNotification,
  getNotificationById,
  getNotificationRecordById,
  updateNotification,
  deleteNotification,
  listNotifications,
  normalizeStatus,
  normalizeAudienceType,
};
