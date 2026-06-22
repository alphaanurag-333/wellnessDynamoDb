const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");
const { isValidDateOnly } = require("../utils/dateOnly");

const TABLE = "BirthdayPost";
const STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizePostDate(value) {
  const raw = String(value || "").trim();
  if (!isValidDateOnly(raw)) return null;
  return raw;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicBirthdayPost(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  delete row.bannerImage;
  return row;
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "message") return String(value).trim();
  if (key === "postDate") return normalizePostDate(value);
  return value;
}

async function findBirthdayPostByUserAndDate(userId, postDate) {
  const uid = String(userId || "").trim();
  const date = normalizePostDate(postDate);
  if (!uid || !date) return null;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "UserPostDateIndex",
      KeyConditionExpression: "userId = :userId AND postDate = :postDate",
      ExpressionAttributeValues: {
        ":userId": uid,
        ":postDate": date,
      },
      Limit: 1,
    })
  );

  return withLegacyId(Items?.[0] || null);
}

async function createBirthdayPost({
  userId,
  notificationId = null,
  postDate,
  message = "",
  status = "active",
}) {
  const uid = String(userId || "").trim();
  const date = normalizePostDate(postDate);
  if (!uid) throw new Error("userId is required");
  if (!date) throw new Error("postDate must be YYYY-MM-DD");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    notificationId: notificationId ? String(notificationId).trim() : null,
    postDate: date,
    message: String(message || "").trim(),
    status: normalizeStatus(status),
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

  return toPublicBirthdayPost(item);
}

async function getBirthdayPostRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getBirthdayPostById(id) {
  const item = await getBirthdayPostRecordById(id);
  return item ? toPublicBirthdayPost(item) : null;
}

async function updateBirthdayPost(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "userId", "postDate", "notificationId"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
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

  return toPublicBirthdayPost(Attributes || null);
}

async function deleteBirthdayPost(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listBirthdayPostsByPostDate({
  postDate,
  page = 1,
  limit = 10,
  status = "active",
} = {}) {
  const date = normalizePostDate(postDate);
  if (!date) {
    return {
      birthdayPosts: [],
      pagination: { page: 1, limit, total: 0, pages: 1 },
    };
  }

  const normalizedStatus = normalizeStatus(status, "");
  let filterExpression;
  const exprNames = {};
  const exprValues = {};

  if (normalizedStatus) {
    exprNames["#status"] = "status";
    exprValues[":status"] = normalizedStatus;
    filterExpression = "#status = :status";
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "PostDateCreatedAtIndex",
    partitionKeyName: "postDate",
    partitionKeyValue: date,
    filterExpression,
    exprNames,
    exprValues,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    birthdayPosts: items.map((row) => toPublicBirthdayPost(row)),
    pagination,
  };
}

async function listBirthdayPosts({
  page = 1,
  limit = 10,
  status,
  postDate,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedDate = postDate ? normalizePostDate(postDate) : "";

  if (normalizedDate) {
    return listBirthdayPostsByPostDate({
      postDate: normalizedDate,
      page,
      limit,
      status: normalizedStatus || undefined,
    });
  }

  const statusPartitions = normalizedStatus ? [normalizedStatus] : ["active", "inactive"];
  const allItems = [];

  for (const partition of statusPartitions) {
    let filterExpression;
    const exprNames = {};
    const exprValues = {};

    const { items } = await listByPartitionKey({
      tableName: TABLE,
      indexName: "StatusPostDateIndex",
      partitionKeyName: "status",
      partitionKeyValue: partition,
      filterExpression,
      exprNames,
      exprValues,
      scanIndexForward: false,
      page: 1,
      limit: 500,
      maxLimit: 500,
      sortFn: (a, b) => String(b.postDate).localeCompare(String(a.postDate)),
    });
    allItems.push(...items);
  }

  const sorted = [...allItems].sort((a, b) => {
    const dateCmp = String(b.postDate).localeCompare(String(a.postDate));
    if (dateCmp !== 0) return dateCmp;
    return String(b.createdAt).localeCompare(String(a.createdAt));
  });

  const total = sorted.length;
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 200));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safeLimit;

  return {
    birthdayPosts: sorted.slice(start, start + safeLimit).map((row) => toPublicBirthdayPost(row)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

module.exports = {
  createBirthdayPost,
  findBirthdayPostByUserAndDate,
  getBirthdayPostById,
  getBirthdayPostRecordById,
  updateBirthdayPost,
  deleteBirthdayPost,
  listBirthdayPosts,
  listBirthdayPostsByPostDate,
  normalizeStatus,
};
