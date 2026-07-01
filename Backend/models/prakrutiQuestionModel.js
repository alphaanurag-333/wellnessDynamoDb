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

const TABLE = "PrakrutiQuestion";
const PRAKRUTI_QUESTION_ALLOWED_STATUS = ["active", "inactive"];
const STATUS = new Set(PRAKRUTI_QUESTION_ALLOWED_STATUS);

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

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "category") return String(value || "").trim();
  if (key === "question") return String(value || "").trim();
  if (key === "sortOrder") return normalizeSortOrder(value);
  return value;
}

function sortQuestions(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  const cat = String(a.category || "").localeCompare(String(b.category || ""));
  if (cat !== 0) return cat;
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

async function createPrakrutiQuestion({ category, question, sortOrder = 0, status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    category: String(category || "").trim(),
    question: String(question || "").trim(),
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
  return withLegacyId(item);
}

async function getPrakrutiQuestionRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(Item || null);
}

async function getPrakrutiQuestionById(id) {
  const item = await getPrakrutiQuestionRecordById(id);
  return item ? withLegacyId(item) : null;
}

async function updatePrakrutiQuestion(id, updates) {
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

async function deletePrakrutiQuestion(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listActivePrakrutiQuestions() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
  });
  return items.map((q) => withLegacyId(q)).sort(sortQuestions);
}

async function listPrakrutiQuestions({ page = 1, limit = 10, status, search, category } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["question", "category"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (category && String(category).trim()) {
    const catExpr = "contains(#category, :categoryFilter)";
    exprNames["#category"] = "category";
    exprValues[":categoryFilter"] = String(category).trim();
    filterExpression = filterExpression ? `${filterExpression} AND ${catExpr}` : catExpr;
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
    questions: items.map((row) => withLegacyId(row)).sort(sortQuestions),
    pagination,
  };
}

module.exports = {
  PRAKRUTI_QUESTION_ALLOWED_STATUS,
  normalizeStatus,
  normalizeSortOrder,
  sortQuestions,
  createPrakrutiQuestion,
  getPrakrutiQuestionById,
  getPrakrutiQuestionRecordById,
  updatePrakrutiQuestion,
  deletePrakrutiQuestion,
  listPrakrutiQuestions,
  listActivePrakrutiQuestions,
};
