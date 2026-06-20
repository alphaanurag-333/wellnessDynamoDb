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
  normalizeMediaItemFromStorage,
  legacyFieldsToRemoveOnUpdate,
  normalizeUpdateFieldName,
} = require("../utils/mediaFieldAliases");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const RECIPE_MEDIA_FIELDS = ["thumbnail", "video"];

const TABLE = "HealthRecipe";
const HEALTH_RECIPE_ALLOWED_STATUS = ["active", "inactive"];
const HEALTH_RECIPE_ALLOWED_TYPE = ["ytlink", "video"];
const STATUS = new Set(HEALTH_RECIPE_ALLOWED_STATUS);
const TYPE = new Set(HEALTH_RECIPE_ALLOWED_TYPE);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "ytlink") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPE.has(next) ? next : fallback;
}

function normalizeVideoSpecification(value) {
  if (!Array.isArray(value)) return [];
  return value.map((x) => String(x || "").trim()).filter(Boolean);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicHealthRecipe(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  return row ? resolveMediaFields(row, RECIPE_MEDIA_FIELDS) : null;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "status") return normalizeStatus(value);
  if (field === "type") return normalizeType(value);
  if (field === "videoSpecification") return normalizeVideoSpecification(value);
  if (field === "thumbnail" || field === "video") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, field);
  }
  if (["healthConcernId", "title", "description", "ytLink"].includes(field)) {
    return String(value || "").trim();
  }
  return value;
}

async function createHealthRecipe({
  healthConcernId,
  title,
  description,
  thumbnail,
  type = "ytlink",
  ytLink = "",
  video = "",
  videoSpecification,
  video_specification = [],
  status = "active",
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    healthConcernId: String(healthConcernId || "").trim(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    thumbnail: normalizeMediaField(thumbnail, "thumbnail"),
    type: normalizeType(type),
    ytLink: String(ytLink || "").trim(),
    video: video ? normalizeMediaField(video, "video") : "",
    videoSpecification: normalizeVideoSpecification(videoSpecification ?? video_specification),
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
  return toPublicHealthRecipe(item);
}

async function getHealthRecipeRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getHealthRecipeById(id) {
  const item = await getHealthRecipeRecordById(id);
  return item ? toPublicHealthRecipe(item) : null;
}

async function updateHealthRecipe(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [normalizeUpdateFieldName(k), sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
  }

  const removeFields = legacyFieldsToRemoveOnUpdate(Object.fromEntries(entries));
  let updateExpression = setExpr;
  if (removeFields.length > 0) {
    updateExpression += ` REMOVE ${removeFields.join(", ")}`;
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
  return toPublicHealthRecipe(Attributes || null);
}

async function deleteHealthRecipe(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listHealthRecipes({ page = 1, limit = 10, status, type, healthConcernId, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedType = type ? normalizeType(type, "") : "";
  const normalizedHealthConcernId = String(healthConcernId || "").trim();
  const searchFilter = buildContainsFilter(["title", "description"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedType) {
    exprNames["#type"] = "type";
    exprValues[":type"] = normalizedType;
    filterExpression = appendFilter(filterExpression, "#type = :type");
  }

  const useHealthConcernIndex = Boolean(normalizedHealthConcernId);
  const indexName = useHealthConcernIndex ? "HealthConcernCreatedAtIndex" : "StatusCreatedAtIndex";
  const partitionKeyName = useHealthConcernIndex ? "healthConcernId" : "status";
  const partitionKeyValue = useHealthConcernIndex
    ? normalizedHealthConcernId
    : normalizedStatus || undefined;

  if (normalizedStatus && partitionKeyName !== "status") {
    exprNames["#status"] = "status";
    exprValues[":status"] = normalizedStatus;
    filterExpression = appendFilter(filterExpression, "#status = :status");
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
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
    healthRecipes: items.map((row) => toPublicHealthRecipe(row)),
    pagination,
  };
}

module.exports = {
  HEALTH_RECIPE_ALLOWED_STATUS,
  HEALTH_RECIPE_ALLOWED_TYPE,
  normalizeStatus,
  normalizeType,
  normalizeVideoSpecification,
  createHealthRecipe,
  getHealthRecipeById,
  getHealthRecipeRecordById,
  updateHealthRecipe,
  deleteHealthRecipe,
  listHealthRecipes,
};
