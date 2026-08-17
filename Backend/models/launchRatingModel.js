const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { listByPartitionKey } = require("../utils/dynamoList");

const TABLE = "LaunchRating";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_TONES = new Set(["excellent", "good", "average", "poor", "default"]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;
const POINTS_MIN = 1;
const POINTS_MAX = 100;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeTone(value, fallback = "default") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_TONES.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function normalizePoints(value, fallback = POINTS_MIN) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(POINTS_MAX, Math.max(POINTS_MIN, Math.round(n)));
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sortRatings(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

function toPublicRating(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    name: row.name,
    badge: row.badge || String(row.name || "").toUpperCase(),
    tone: normalizeTone(row.tone),
    points: normalizePoints(row.points),
    description: row.description || "",
    sortOrder: normalizeSortOrder(row.sortOrder),
    status: normalizeStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listAllRatingsUnpaged() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortRatings,
  });
  return (items || []).map(toPublicRating).filter(Boolean);
}

async function nextSortOrder() {
  const items = await listAllRatingsUnpaged();
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => Math.max(acc, normalizeSortOrder(item.sortOrder, 0)), 0);
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createLaunchRating({
  name,
  badge,
  tone = "default",
  points,
  description = "",
  sortOrder,
  status = "active",
} = {}) {
  const now = new Date().toISOString();
  const trimmedName = String(name || "").trim();
  const item = {
    id: uuidv4(),
    name: trimmedName,
    badge: String(badge || trimmedName).trim().toUpperCase(),
    tone: normalizeTone(tone),
    points: normalizePoints(points),
    description: String(description || "").trim(),
    sortOrder:
      sortOrder === undefined || sortOrder === null || sortOrder === ""
        ? await nextSortOrder()
        : normalizeSortOrder(sortOrder),
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
  return toPublicRating(item);
}

async function getLaunchRatingById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return toPublicRating(Item || null);
}

async function updateLaunchRating(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = value;
    setExpr += `, #${key} = :${key}`;
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
  return toPublicRating(Attributes);
}

async function deleteLaunchRating(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listLaunchRatings({ page = 1, limit = 50, status } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortRatings,
  });
  return {
    ratings: items.map(toPublicRating).filter(Boolean),
    pagination,
  };
}

module.exports = {
  TABLE,
  ALLOWED_TONES,
  ALLOWED_STATUS,
  POINTS_MIN,
  POINTS_MAX,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  normalizeStatus,
  normalizeTone,
  normalizeSortOrder,
  normalizePoints,
  createLaunchRating,
  getLaunchRatingById,
  updateLaunchRating,
  deleteLaunchRating,
  listLaunchRatings,
  listAllRatingsUnpaged,
  toPublicRating,
};
