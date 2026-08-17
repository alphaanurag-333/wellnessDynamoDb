const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { listByPartitionKey } = require("../utils/dynamoList");

const TABLE = "LaunchDomain";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;
const WEIGHT_MIN = 0;
const WEIGHT_MAX = 100;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function normalizeWeight(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(WEIGHT_MAX, Math.max(WEIGHT_MIN, Math.round(n)));
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sortDomains(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

function toPublicDomain(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const live = row.live !== false && normalizeStatus(row.status) === "active";
  return {
    id: row.id,
    _id: row._id,
    name: row.name,
    weight: normalizeWeight(row.weight),
    live,
    fixed: normalizeBool(row.fixed),
    sortOrder: normalizeSortOrder(row.sortOrder),
    status: normalizeStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listAllDomainsUnpaged() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortDomains,
  });
  return (items || []).map(toPublicDomain).filter(Boolean);
}

async function nextSortOrder() {
  const items = await listAllDomainsUnpaged();
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => Math.max(acc, normalizeSortOrder(item.sortOrder, 0)), 0);
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createLaunchDomain({
  name,
  weight = 0,
  live = true,
  fixed = false,
  sortOrder,
  status,
} = {}) {
  const now = new Date().toISOString();
  const isLive = live !== false;
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    weight: normalizeWeight(weight),
    live: isLive,
    fixed: normalizeBool(fixed),
    sortOrder:
      sortOrder === undefined || sortOrder === null || sortOrder === ""
        ? await nextSortOrder()
        : normalizeSortOrder(sortOrder),
    status: normalizeStatus(status ?? (isLive ? "active" : "inactive")),
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
  return toPublicDomain(item);
}

async function getLaunchDomainById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return toPublicDomain(Item || null);
}

async function getLaunchDomainRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(Item || null);
}

async function updateLaunchDomain(id, updates) {
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
  return toPublicDomain(Attributes);
}

async function deleteLaunchDomain(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listLaunchDomains({ page = 1, limit = 50, status } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortDomains,
  });
  return {
    domains: items.map(toPublicDomain).filter(Boolean),
    pagination,
  };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  WEIGHT_MIN,
  WEIGHT_MAX,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  normalizeStatus,
  normalizeSortOrder,
  normalizeWeight,
  normalizeBool,
  createLaunchDomain,
  getLaunchDomainById,
  getLaunchDomainRecordById,
  updateLaunchDomain,
  deleteLaunchDomain,
  listLaunchDomains,
  listAllDomainsUnpaged,
  toPublicDomain,
};
