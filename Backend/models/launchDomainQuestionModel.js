const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  BatchWriteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");
const { listByPartitionKey } = require("../utils/dynamoList");

const TABLE = "LaunchDomainQuestion";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;
const POINTS_MIN = 0;
const POINTS_MAX = 100;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function normalizePoints(value, fallback = 6) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(POINTS_MAX, Math.max(POINTS_MIN, Math.round(n)));
}

function normalizeBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sortQuestions(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

function toPublicQuestion(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const enabled = row.enabled !== false && normalizeStatus(row.status) === "active";
  return {
    id: row.id,
    _id: row._id,
    domainId: row.domainId,
    name: row.name,
    points: normalizePoints(row.points),
    enabled,
    fixed: normalizeBool(row.fixed),
    hasInfo: row.hasInfo !== false,
    sortOrder: normalizeSortOrder(row.sortOrder),
    status: normalizeStatus(row.status),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listQuestionsByDomainId(domainId) {
  if (!domainId) return [];
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "DomainIdIndex",
    partitionKeyName: "domainId",
    partitionKeyValue: String(domainId),
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: sortQuestions,
  });
  return (items || []).map(toPublicQuestion).filter(Boolean);
}

async function listAllQuestionsUnpaged() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortQuestions,
  });
  return (items || []).map(toPublicQuestion).filter(Boolean);
}

async function nextSortOrder(domainId) {
  const items = await listQuestionsByDomainId(domainId);
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => Math.max(acc, normalizeSortOrder(item.sortOrder, 0)), 0);
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createLaunchDomainQuestion({
  domainId,
  name,
  points,
  enabled = true,
  fixed = false,
  hasInfo = true,
  sortOrder,
  status,
} = {}) {
  const now = new Date().toISOString();
  const isEnabled = enabled !== false;
  const resolvedOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? await nextSortOrder(domainId)
      : normalizeSortOrder(sortOrder);

  const item = {
    id: uuidv4(),
    domainId: String(domainId || "").trim(),
    name: String(name || "").trim(),
    points: normalizePoints(points),
    enabled: isEnabled,
    fixed: normalizeBool(fixed),
    hasInfo: hasInfo !== false,
    sortOrder: resolvedOrder,
    status: normalizeStatus(status ?? (isEnabled ? "active" : "inactive")),
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
  return toPublicQuestion(item);
}

async function getLaunchDomainQuestionById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return toPublicQuestion(Item || null);
}

async function updateLaunchDomainQuestion(id, updates) {
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
  return toPublicQuestion(Attributes);
}

async function deleteLaunchDomainQuestion(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function deleteQuestionsByDomainId(domainId) {
  const questions = await listQuestionsByDomainId(domainId);
  if (!questions.length) return 0;

  for (let i = 0; i < questions.length; i += 25) {
    const chunk = questions.slice(i, i + 25);
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE]: chunk.map((row) => ({
            DeleteRequest: { Key: { id: row.id } },
          })),
        },
      })
    );
  }
  return questions.length;
}

async function listLaunchDomainQuestions({ page = 1, limit = 50, status, domainId } = {}) {
  if (domainId) {
    const all = await listQuestionsByDomainId(domainId);
    const filtered = status
      ? all.filter((row) => row.status === normalizeStatus(status, ""))
      : all;
    const start = (Math.max(1, Number(page) || 1) - 1) * Math.max(1, Number(limit) || 50);
    const size = Math.min(200, Math.max(1, Number(limit) || 50));
    return {
      questions: filtered.slice(start, start + size),
      pagination: {
        page: Math.max(1, Number(page) || 1),
        limit: size,
        total: filtered.length,
        pages: Math.max(1, Math.ceil(filtered.length / size)),
      },
    };
  }

  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 500,
    sortFn: sortQuestions,
  });
  return {
    questions: items.map(toPublicQuestion).filter(Boolean),
    pagination,
  };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  POINTS_MIN,
  POINTS_MAX,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  normalizeStatus,
  normalizeSortOrder,
  normalizePoints,
  normalizeBool,
  createLaunchDomainQuestion,
  getLaunchDomainQuestionById,
  updateLaunchDomainQuestion,
  deleteLaunchDomainQuestion,
  deleteQuestionsByDomainId,
  listLaunchDomainQuestions,
  listQuestionsByDomainId,
  listAllQuestionsUnpaged,
  toPublicQuestion,
};
