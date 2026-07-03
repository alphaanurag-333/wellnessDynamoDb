const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TRANSFORMATION_MEDIA = ["oldImage", "newImage"];

const TABLE = "Transformation";
const STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicTransformation(item) {
  const row = withLegacyId(item);
  return row ? resolveMediaFields(row, TRANSFORMATION_MEDIA) : null;
}

function normalizeImageField(value, fieldName) {
  if (value == null || String(value).trim() === "") return "";
  return normalizeMediaField(value, fieldName);
}

async function createTransformation({ name, timeTaken, achievements, oldImage, newImage, description, status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    timeTaken: Number(timeTaken),
    achievements: String(achievements || "").trim(),
    oldImage: normalizeImageField(oldImage, "oldImage"),
    newImage: normalizeImageField(newImage, "newImage"),
    description: String(description || "").trim(),
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
    exprValues[v] =
      key === "oldImage" || key === "newImage"
        ? normalizeImageField(value, key)
        : value;
    setExpr += `, ${n} = ${v}`;
  }

  const updateParts = [setExpr];

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: updateParts.join(" "),
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

  const indexName = "StatusCreatedAtIndex";
  const partitionKeyName = "status";
  const partitionKeyValue = normalizedStatus || undefined;

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
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
};
