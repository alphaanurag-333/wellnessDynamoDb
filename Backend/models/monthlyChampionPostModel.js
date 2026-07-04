const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { listByPartitionKey, sortByCreatedAtDesc } = require("../utils/dynamoList");

const TABLE = "MonthlyChampionPost";
const STATUS = new Set(["active", "inactive"]);
const MONTH_YEAR_REGEX = /^\d{4}-\d{2}$/;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeMonthYear(value) {
  const raw = String(value || "").trim();
  return MONTH_YEAR_REGEX.test(raw) ? raw : null;
}

function monthLabel(monthYear) {
  const match = MONTH_YEAR_REGEX.exec(String(monthYear || ""));
  if (!match) return String(monthYear || "");
  const [year, month] = monthYear.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, 1));
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "message") return String(value).trim();
  return value;
}

async function findMonthlyChampionPostByUserAndMonth(userId, monthYear) {
  const uid = String(userId || "").trim();
  const month = normalizeMonthYear(monthYear);
  if (!uid || !month) return null;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "UserMonthYearIndex",
      KeyConditionExpression: "userId = :userId AND monthYear = :monthYear",
      ExpressionAttributeValues: {
        ":userId": uid,
        ":monthYear": month,
      },
      Limit: 1,
    })
  );

  return withLegacyId(Items?.[0] || null);
}

async function createMonthlyChampionPost({
  userId,
  monthYear,
  rank,
  averageScore,
  daysSubmitted,
  message = "",
  status = "active",
}) {
  const uid = String(userId || "").trim();
  const month = normalizeMonthYear(monthYear);
  if (!uid) throw new Error("userId is required");
  if (!month) throw new Error("monthYear must be YYYY-MM");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    monthYear: month,
    rank: Number(rank) || 0,
    averageScore: Number(averageScore) || 0,
    daysSubmitted: Number(daysSubmitted) || 0,
    message: String(message || "").trim(),
    status: normalizeStatus(status),
    notifiedAt: null,
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

  return withLegacyId(item);
}

async function getMonthlyChampionPostRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getMonthlyChampionPostById(id) {
  return getMonthlyChampionPostRecordById(id);
}

async function updateMonthlyChampionPost(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "userId", "monthYear"]);
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

  return withLegacyId(Attributes || null);
}

async function deleteMonthlyChampionPost(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listMonthlyChampionPostsByMonth({
  monthYear,
  page = 1,
  limit = 20,
  status = "active",
} = {}) {
  const month = normalizeMonthYear(monthYear);
  if (!month) {
    return {
      monthlyChampionPosts: [],
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
    indexName: "MonthYearCreatedAtIndex",
    partitionKeyName: "monthYear",
    partitionKeyValue: month,
    filterExpression,
    exprNames,
    exprValues,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: (a, b) => {
      const rankCmp = (Number(a.rank) || 0) - (Number(b.rank) || 0);
      if (rankCmp !== 0) return rankCmp;
      return (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0);
    },
  });

  return {
    monthlyChampionPosts: items.map((row) => withLegacyId(row)),
    pagination,
  };
}

async function listMonthlyChampionPosts({ page = 1, limit = 10, status, monthYear } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedMonth = monthYear ? normalizeMonthYear(monthYear) : "";

  if (normalizedMonth) {
    return listMonthlyChampionPostsByMonth({
      monthYear: normalizedMonth,
      page,
      limit,
      status: normalizedStatus || undefined,
    });
  }

  const statusPartitions = normalizedStatus ? [normalizedStatus] : ["active", "inactive"];
  const allItems = [];

  for (const partition of statusPartitions) {
    const { items } = await listByPartitionKey({
      tableName: TABLE,
      indexName: "StatusMonthYearIndex",
      partitionKeyName: "status",
      partitionKeyValue: partition,
      scanIndexForward: false,
      page: 1,
      limit: 500,
      maxLimit: 500,
      sortFn: (a, b) => String(b.monthYear).localeCompare(String(a.monthYear)),
    });
    allItems.push(...items);
  }

  const sorted = [...allItems].sort((a, b) => {
    const monthCmp = String(b.monthYear).localeCompare(String(a.monthYear));
    if (monthCmp !== 0) return monthCmp;
    const rankCmp = (Number(a.rank) || 0) - (Number(b.rank) || 0);
    if (rankCmp !== 0) return rankCmp;
    return (Number(b.averageScore) || 0) - (Number(a.averageScore) || 0);
  });

  const total = sorted.length;
  const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 200));
  const safePage = Math.max(1, Number(page) || 1);
  const start = (safePage - 1) * safeLimit;

  return {
    monthlyChampionPosts: sorted.slice(start, start + safeLimit).map((row) => withLegacyId(row)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

async function listMonthlyChampionPostsForUser(userId, { limit = 24 } = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "UserMonthYearIndex",
    partitionKeyName: "userId",
    partitionKeyValue: uid,
    scanIndexForward: false,
    page: 1,
    limit,
    maxLimit: 200,
    sortFn: (a, b) => String(b.monthYear).localeCompare(String(a.monthYear)),
  });

  return items.map((row) => withLegacyId(row));
}

/**
 * Finds the most recent month (<= given cutoff, or any) that has active champion posts.
 * Used so `GET /monthly-champions` without a `monthYear` param shows the latest available data.
 */
async function findLatestMonthWithChampions() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusMonthYearIndex",
    partitionKeyName: "status",
    partitionKeyValue: "active",
    scanIndexForward: false,
    page: 1,
    limit: 1,
    maxLimit: 1,
    sortFn: (a, b) => String(b.monthYear).localeCompare(String(a.monthYear)),
  });

  return items[0]?.monthYear || null;
}

module.exports = {
  TABLE,
  normalizeStatus,
  normalizeMonthYear,
  monthLabel,
  createMonthlyChampionPost,
  findMonthlyChampionPostByUserAndMonth,
  getMonthlyChampionPostById,
  getMonthlyChampionPostRecordById,
  updateMonthlyChampionPost,
  deleteMonthlyChampionPost,
  listMonthlyChampionPosts,
  listMonthlyChampionPostsByMonth,
  listMonthlyChampionPostsForUser,
  findLatestMonthWithChampions,
};
