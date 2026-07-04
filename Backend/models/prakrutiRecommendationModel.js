const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");
const { normalizePrakrutiType } = require("../utils/prakrutiConstants");

const TABLE = "PrakrutiRecommendation";
const PRAKRUTI_RECOMMENDATION_ALLOWED_STATUS = ["active", "inactive"];
const STATUS = new Set(PRAKRUTI_RECOMMENDATION_ALLOWED_STATUS);
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

function sortRecommendations(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.title || "").localeCompare(String(b.title || ""));
}

function toPublicRecommendation(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    prakrutiType: normalizePrakrutiType(row.prakrutiType) || row.prakrutiType,
    title: row.title,
    sortOrder: normalizeSortOrder(row.sortOrder),
    status: normalizeStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createPrakrutiRecommendation({ prakrutiType, title, sortOrder = 0, status = "active" }) {
  const type = normalizePrakrutiType(prakrutiType);
  if (!type) {
    const err = new Error("Invalid prakrutiType");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    prakrutiType: type,
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
  return toPublicRecommendation(item);
}

async function getPrakrutiRecommendationRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(Item || null);
}

async function getPrakrutiRecommendationById(id) {
  const item = await getPrakrutiRecommendationRecordById(id);
  return item ? toPublicRecommendation(item) : null;
}

async function updatePrakrutiRecommendation(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => {
      if (k === "status") return [k, normalizeStatus(v)];
      if (k === "sortOrder") return [k, normalizeSortOrder(v)];
      if (k === "title") return [k, String(v || "").trim()];
      if (k === "prakrutiType") {
        const type = normalizePrakrutiType(v);
        if (!type) {
          const err = new Error("Invalid prakrutiType");
          err.name = "ValidationError";
          throw err;
        }
        return [k, type];
      }
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
  return toPublicRecommendation(Attributes);
}

async function deletePrakrutiRecommendation(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listActivePrakrutiRecommendationsByType(prakrutiType) {
  const type = normalizePrakrutiType(prakrutiType);
  if (!type) return [];

  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "PrakrutiTypeCreatedAtIndex",
    partitionKeyValue: type,
    partitionKeyName: "prakrutiType",
    filterExpression: "#status = :active",
    exprNames: { "#status": "status" },
    exprValues: { ":active": "active" },
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
  });

  return items.map((row) => toPublicRecommendation(row)).filter(Boolean).sort(sortRecommendations);
}

async function listPrakrutiRecommendations({ page = 1, limit = 10, status, search, prakrutiType } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["title"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  const type = prakrutiType ? normalizePrakrutiType(prakrutiType) : null;
  if (prakrutiType && !type) {
    return { recommendations: [], pagination: { page: 1, pages: 1, total: 0, limit } };
  }
  if (type) {
    const typeExpr = "#prakrutiType = :prakrutiTypeFilter";
    exprNames["#prakrutiType"] = "prakrutiType";
    exprValues[":prakrutiTypeFilter"] = type;
    filterExpression = filterExpression ? `${filterExpression} AND ${typeExpr}` : typeExpr;
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
    recommendations: items.map((row) => toPublicRecommendation(row)).sort(sortRecommendations),
    pagination,
  };
}

module.exports = {
  PRAKRUTI_RECOMMENDATION_ALLOWED_STATUS,
  normalizeStatus,
  normalizeSortOrder,
  createPrakrutiRecommendation,
  getPrakrutiRecommendationById,
  getPrakrutiRecommendationRecordById,
  updatePrakrutiRecommendation,
  deletePrakrutiRecommendation,
  listPrakrutiRecommendations,
  listActivePrakrutiRecommendationsByType,
  toPublicRecommendation,
};
