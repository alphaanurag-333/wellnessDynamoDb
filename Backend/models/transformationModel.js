const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
} = require("../utils/dynamoList");

const TRANSFORM_MEDIA = ["oldImage", "newImage"];

const TABLE = "Transformation";
const STATUS = new Set(["active", "inactive"]);
const ORDER_MIN = 0;
const ORDER_MAX = 100000;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), ORDER_MAX);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicTransformation(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const resolved = resolveMediaFields(row, TRANSFORM_MEDIA);
  return {
    ...resolved,
    order: normalizeOrder(resolved.order, 9999),
  };
}

function normalizeImageField(value, fieldName) {
  if (value == null || String(value).trim() === "") return "";
  return normalizeMediaField(value, fieldName);
}

/** Lower `order` first; missing order last; then newest createdAt. */
function sortByOrderAsc(a, b) {
  const orderA = normalizeOrder(a?.order, 9999);
  const orderB = normalizeOrder(b?.order, 9999);
  if (orderA !== orderB) return orderA - orderB;
  const aTime = new Date(a?.createdAt || 0).getTime();
  const bTime = new Date(b?.createdAt || 0).getTime();
  return bTime - aTime;
}

async function createTransformation({
  name,
  timeTaken,
  inchesLost,
  achievements,
  oldImage,
  newImage,
  description,
  order = 0,
  status = "active",
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    timeTaken: Number(timeTaken),
    inchesLost: Number(inchesLost),
    achievements: String(achievements || "").trim(),
    oldImage: normalizeImageField(oldImage, "oldImage"),
    newImage: normalizeImageField(newImage, "newImage"),
    description: String(description || "").trim(),
    order: normalizeOrder(order),
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

  return toPublicTransformation(item);
}

async function getTransformationRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getTransformationById(id) {
  const item = await getTransformationRecordById(id);
  return item ? toPublicTransformation(item) : null;
}

async function updateTransformation(id, updates) {
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
    if (key === "oldImage" || key === "newImage") {
      exprValues[v] = normalizeImageField(value, key);
    } else if (key === "order") {
      exprValues[v] = normalizeOrder(value);
    } else if (key === "status") {
      exprValues[v] = normalizeStatus(value);
    } else {
      exprValues[v] = value;
    }
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

  return toPublicTransformation(Attributes || null);
}

async function deleteTransformation(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listTransformations({ page = 1, limit = 10, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "achievements", "description"], search);
  const filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };
  const hasSearch = Boolean(searchFilter.search);

  // StatusOrderIndex: status HASH + order RANGE (ascending). Dynamo paginates in order.
  // In-memory sort only when merging statuses or after search (GSI order no longer applies).
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusOrderIndex",
    partitionKeyName: "status",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: !normalizedStatus || hasSearch ? sortByOrderAsc : undefined,
  });

  return {
    transformations: items.map((row) => toPublicTransformation(row)),
    pagination,
  };
}

module.exports = {
  createTransformation,
  getTransformationById,
  getTransformationRecordById,
  updateTransformation,
  deleteTransformation,
  listTransformations,
  normalizeStatus,
  normalizeOrder,
  ORDER_MIN,
  ORDER_MAX,
};
