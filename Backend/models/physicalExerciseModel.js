const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { resolvePublicUrl } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "PhysicalExercise";
const PHYSICAL_EXERCISE_ALLOWED_STATUS = ["active", "inactive"];
const PHYSICAL_EXERCISE_ALLOWED_TYPE = ["ytlink", "video"];
const STATUS = new Set(PHYSICAL_EXERCISE_ALLOWED_STATUS);
const TYPE = new Set(PHYSICAL_EXERCISE_ALLOWED_TYPE);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "ytlink") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPE.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

/** For type=video, link stores an S3 object key; resolve it to a public URL on read. */
function toPublicPhysicalExercise(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  if (row.type === "video" && row.link) {
    return { ...row, link: resolvePublicUrl(row.link) || row.link };
  }
  return row;
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "type") return normalizeType(value);
  if (["title", "description", "link"].includes(key)) {
    return String(value || "").trim();
  }
  return value;
}

async function createPhysicalExercise({
  title,
  description,
  type = "ytlink",
  link = "",
  status = "active",
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    type: normalizeType(type),
    link: String(link || "").trim(),
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return toPublicPhysicalExercise(item);
}

async function getPhysicalExerciseRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getPhysicalExerciseById(id) {
  const item = await getPhysicalExerciseRecordById(id);
  return item ? toPublicPhysicalExercise(item) : null;
}

async function updatePhysicalExercise(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
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

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
  }));
  return toPublicPhysicalExercise(Attributes || null);
}

async function deletePhysicalExercise(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listPhysicalExercises({ page = 1, limit = 10, status, type, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedType = type ? String(type).toLowerCase().trim() : "";
  const searchFilter = buildContainsFilter(["title", "description"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedType && TYPE.has(normalizedType)) {
    exprNames["#type"] = "type";
    exprValues[":type"] = normalizedType;
    filterExpression = appendFilter(filterExpression, "#type = :type");
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    physicalExercises: items.map((row) => toPublicPhysicalExercise(row)),
    pagination,
  };
}

async function listActivePhysicalExercises() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: false,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: sortByCreatedAtDesc,
  });
  return items.map((row) => toPublicPhysicalExercise(row)).filter(Boolean);
}

module.exports = {
  PHYSICAL_EXERCISE_ALLOWED_STATUS,
  PHYSICAL_EXERCISE_ALLOWED_TYPE,
  normalizeStatus,
  normalizeType,
  createPhysicalExercise,
  getPhysicalExerciseById,
  getPhysicalExerciseRecordById,
  updatePhysicalExercise,
  deletePhysicalExercise,
  listPhysicalExercises,
  listActivePhysicalExercises,
};
