const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  BatchGetCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "LaunchFocusArea";
const LAUNCH_FOCUS_AREA_ALLOWED_STATUS = ["active", "inactive"];
const STATUS = new Set(LAUNCH_FOCUS_AREA_ALLOWED_STATUS);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sortFocusAreas(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function toPublicFocusArea(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    title: row.title,
    sortOrder: normalizeSortOrder(row.sortOrder),
    status: normalizeStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createLaunchFocusArea({ title, sortOrder = 0, status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    sortOrder: normalizeSortOrder(sortOrder),
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
  return toPublicFocusArea(item);
}

async function getLaunchFocusAreaRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(Item || null);
}

async function getLaunchFocusAreaById(id) {
  const item = await getLaunchFocusAreaRecordById(id);
  return item ? toPublicFocusArea(item) : null;
}

async function updateLaunchFocusArea(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => {
      if (k === "status") return [k, normalizeStatus(v)];
      if (k === "sortOrder") return [k, normalizeSortOrder(v)];
      if (k === "title") return [k, String(v || "").trim()];
      return [k, v];
    });
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
  return toPublicFocusArea(Attributes);
}

async function deleteLaunchFocusArea(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listActiveLaunchFocusAreas() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
  });
  return items.map((row) => toPublicFocusArea(row)).filter(Boolean).sort(sortFocusAreas);
}

async function listLaunchFocusAreas({ page = 1, limit = 10, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["title"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    focusAreas: items.map((row) => toPublicFocusArea(row)).sort(sortFocusAreas),
    pagination,
  };
}

function normalizeFocusAreaIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function getActiveLaunchFocusAreasByIds(ids) {
  const uniqueIds = normalizeFocusAreaIds(ids);
  if (uniqueIds.length === 0) return [];

  const keys = uniqueIds.map((id) => ({ id }));
  const { Responses } = await docClient.send(
    new BatchGetCommand({
      RequestItems: {
        [TABLE]: { Keys: keys },
      },
    })
  );

  const items = (Responses?.[TABLE] || [])
    .filter((row) => normalizeStatus(row.status) === "active")
    .map((row) => toPublicFocusArea(row))
    .filter(Boolean);

  const order = new Map(uniqueIds.map((id, index) => [id, index]));
  items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return items;
}

async function validateActiveFocusAreaIds(ids) {
  const uniqueIds = normalizeFocusAreaIds(ids);
  if (uniqueIds.length === 0) return [];

  const areas = await getActiveLaunchFocusAreasByIds(uniqueIds);
  if (areas.length !== uniqueIds.length) {
    const err = new Error("One or more focus areas are invalid or inactive");
    err.name = "ValidationError";
    throw err;
  }
  return uniqueIds;
}

module.exports = {
  LAUNCH_FOCUS_AREA_ALLOWED_STATUS,
  normalizeStatus,
  normalizeSortOrder,
  normalizeFocusAreaIds,
  createLaunchFocusArea,
  getLaunchFocusAreaById,
  getLaunchFocusAreaRecordById,
  updateLaunchFocusArea,
  deleteLaunchFocusArea,
  listLaunchFocusAreas,
  listActiveLaunchFocusAreas,
  getActiveLaunchFocusAreasByIds,
  validateActiveFocusAreaIds,
  toPublicFocusArea,
};
