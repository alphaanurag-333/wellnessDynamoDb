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

const TABLE = "PrakrutiThingToAvoid";
const PRAKRUTI_THING_TO_AVOID_ALLOWED_STATUS = ["active", "inactive"];
const STATUS = new Set(PRAKRUTI_THING_TO_AVOID_ALLOWED_STATUS);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sortThingsToAvoid(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function toPublicThingToAvoid(item) {
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

async function createPrakrutiThingToAvoid({ title, sortOrder = 0, status = "active" }) {
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
  return toPublicThingToAvoid(item);
}

async function getPrakrutiThingToAvoidRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(Item || null);
}

async function getPrakrutiThingToAvoidById(id) {
  const item = await getPrakrutiThingToAvoidRecordById(id);
  return item ? toPublicThingToAvoid(item) : null;
}

async function updatePrakrutiThingToAvoid(id, updates) {
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
  return toPublicThingToAvoid(Attributes);
}

async function deletePrakrutiThingToAvoid(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listActivePrakrutiThingsToAvoid() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
  });
  return items.map((row) => toPublicThingToAvoid(row)).filter(Boolean).sort(sortThingsToAvoid);
}

async function listPrakrutiThingsToAvoid({ page = 1, limit = 10, status, search } = {}) {
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
    thingsToAvoid: items.map((row) => toPublicThingToAvoid(row)).sort(sortThingsToAvoid),
    pagination,
  };
}

function normalizeThingToAvoidIds(value) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((id) => String(id || "").trim()).filter(Boolean))];
}

async function getActivePrakrutiThingsToAvoidByIds(ids) {
  const uniqueIds = normalizeThingToAvoidIds(ids);
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
    .map((row) => toPublicThingToAvoid(row))
    .filter(Boolean);

  const order = new Map(uniqueIds.map((id, index) => [id, index]));
  items.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  return items;
}

async function validateActiveThingToAvoidIds(ids) {
  const uniqueIds = normalizeThingToAvoidIds(ids);
  if (uniqueIds.length === 0) return [];

  const items = await getActivePrakrutiThingsToAvoidByIds(uniqueIds);
  if (items.length !== uniqueIds.length) {
    const err = new Error("One or more things to avoid are invalid or inactive");
    err.name = "ValidationError";
    throw err;
  }
  return uniqueIds;
}

module.exports = {
  PRAKRUTI_THING_TO_AVOID_ALLOWED_STATUS,
  normalizeStatus,
  normalizeSortOrder,
  normalizeThingToAvoidIds,
  createPrakrutiThingToAvoid,
  getPrakrutiThingToAvoidById,
  getPrakrutiThingToAvoidRecordById,
  updatePrakrutiThingToAvoid,
  deletePrakrutiThingToAvoid,
  listPrakrutiThingsToAvoid,
  listActivePrakrutiThingsToAvoid,
  getActivePrakrutiThingsToAvoidByIds,
  validateActiveThingToAvoidIds,
  toPublicThingToAvoid,
};
