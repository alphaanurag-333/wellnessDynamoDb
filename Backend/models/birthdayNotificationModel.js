const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
  paginateDynamo,
} = require("../utils/dynamoList");
const { isValidDateOnly } = require("../utils/dateOnly");

const TABLE = "BirthdayNotification";
const STATUS = new Set(["pending", "sent", "failed"]);

function normalizeStatus(value, fallback = "pending") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeNotificationDate(value) {
  const raw = String(value || "").trim();
  if (!isValidDateOnly(raw)) return null;
  return raw;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicBirthdayNotification(item) {
  return withLegacyId(item);
}

async function findBirthdayNotificationByUserAndDate(userId, notificationDate) {
  const uid = String(userId || "").trim();
  const date = normalizeNotificationDate(notificationDate);
  if (!uid || !date) return null;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "UserNotificationDateIndex",
      KeyConditionExpression: "userId = :userId AND notificationDate = :notificationDate",
      ExpressionAttributeValues: {
        ":userId": uid,
        ":notificationDate": date,
      },
      Limit: 1,
    })
  );

  return withLegacyId(Items?.[0] || null);
}

async function createBirthdayNotification({
  userId,
  notificationDate,
  message,
  status = "pending",
}) {
  const uid = String(userId || "").trim();
  const date = normalizeNotificationDate(notificationDate);
  const text = String(message || "").trim();

  if (!uid) throw new Error("userId is required");
  if (!date) throw new Error("notificationDate must be YYYY-MM-DD");
  if (!text) throw new Error("message is required");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    notificationDate: date,
    message: text,
    status: normalizeStatus(status),
    sentAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return toPublicBirthdayNotification(item);
}

async function getBirthdayNotificationRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getBirthdayNotificationById(id) {
  const item = await getBirthdayNotificationRecordById(id);
  return item ? toPublicBirthdayNotification(item) : null;
}

async function updateBirthdayNotification(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";
  const removeKeys = [];

  for (const [key, value] of entries) {
    if (key === "sentAt" && value === null) {
      removeKeys.push(key);
      continue;
    }
    const n = `#${key}`;
    const v = `:${key}`;
    exprNames[n] = key;
    if (key === "status") {
      exprValues[v] = normalizeStatus(value);
    } else if (key === "message") {
      exprValues[v] = String(value).trim();
    } else {
      exprValues[v] = value;
    }
    setExpr += `, ${n} = ${v}`;
  }

  let updateExpression = setExpr;
  if (removeKeys.length > 0) {
    updateExpression += ` REMOVE ${removeKeys.map((k) => `#${k}`).join(", ")}`;
    for (const key of removeKeys) {
      exprNames[`#${key}`] = key;
    }
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicBirthdayNotification(Attributes || null);
}

async function queryNotificationsByStatusAndDate({
  status,
  notificationDate,
  filterExpression,
  exprNames = {},
  exprValues = {},
  page = 1,
  limit = 500,
}) {
  const mergedNames = {
    "#status": "status",
    "#notificationDate": "notificationDate",
    ...exprNames,
  };
  const mergedValues = {
    ":status": status,
    ":notificationDate": notificationDate,
    ...exprValues,
  };

  return paginateDynamo({
    command: QueryCommand,
    baseParams: {
      TableName: TABLE,
      IndexName: "StatusNotificationDateIndex",
      KeyConditionExpression: "#status = :status AND #notificationDate = :notificationDate",
      ScanIndexForward: false,
      ...(filterExpression ? { FilterExpression: filterExpression } : {}),
      ExpressionAttributeNames: mergedNames,
      ExpressionAttributeValues: mergedValues,
    },
    page,
    limit,
    maxLimit: 500,
  });
}

async function listBirthdayNotifications({
  page = 1,
  limit = 10,
  status,
  notificationDate,
  search,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedDate = notificationDate ? normalizeNotificationDate(notificationDate) : "";
  const searchFilter = buildContainsFilter(["message"], search);

  const filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  const statusPartitions = normalizedStatus
    ? [normalizedStatus]
    : ["pending", "sent", "failed"];

  const allItems = [];

  for (const partition of statusPartitions) {
    const { items } = normalizedDate
      ? await queryNotificationsByStatusAndDate({
          status: partition,
          notificationDate: normalizedDate,
          filterExpression,
          exprNames,
          exprValues,
          page: 1,
          limit: 500,
        })
      : await listByPartitionKey({
          tableName: TABLE,
          indexName: "StatusNotificationDateIndex",
          partitionKeyName: "status",
          partitionKeyValue: partition,
          filterExpression,
          exprNames,
          exprValues,
          scanIndexForward: false,
          page: 1,
          limit: 500,
          maxLimit: 500,
          sortFn: sortByCreatedAtDesc,
        });
    allItems.push(...items);
  }

  const sorted = [...allItems].sort((a, b) => {
    const dateCmp = String(b.notificationDate || "").localeCompare(String(a.notificationDate || ""));
    if (dateCmp !== 0) return dateCmp;
    return sortByCreatedAtDesc(a, b);
  });
  const total = sorted.length;
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 200));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safeLimit;
  const slice = sorted.slice(start, start + safeLimit);

  return {
    birthdayNotifications: slice.map((row) => toPublicBirthdayNotification(row)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

module.exports = {
  createBirthdayNotification,
  findBirthdayNotificationByUserAndDate,
  getBirthdayNotificationById,
  getBirthdayNotificationRecordById,
  updateBirthdayNotification,
  listBirthdayNotifications,
  normalizeStatus,
};
