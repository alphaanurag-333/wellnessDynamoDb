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
  paginateItems,
  filterItemsBySearch,
} = require("../utils/dynamoList");

const TABLE = "DietPlanBook";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const TITLE_MIN_LEN = 2;
const TITLE_MAX_LEN = 200;
const CONTENT_MAX_LEN = 4000;

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeTitle(value) {
  const title = String(value || "").trim();
  if (!title) {
    const err = new Error("title is required");
    err.name = "ValidationError";
    throw err;
  }
  if (title.length < TITLE_MIN_LEN) {
    const err = new Error(`title must be at least ${TITLE_MIN_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  if (title.length > TITLE_MAX_LEN) {
    const err = new Error(`title cannot exceed ${TITLE_MAX_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return title;
}

function normalizeContent(value) {
  const content = String(value || "").trim();
  if (!content) {
    const err = new Error("content is required");
    err.name = "ValidationError";
    throw err;
  }
  if (content.length > CONTENT_MAX_LEN) {
    const err = new Error(`content cannot exceed ${CONTENT_MAX_LEN} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return content;
}

function toDietPlanBookPublic(item) {
  if (!item) return null;
  const status = normalizeStatus(item.status);
  return {
    id: item.id,
    title: item.title || "",
    content: item.content || "",
    status,
    live: status !== "inactive",
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

function sortByCreatedAtAsc(a, b) {
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

async function createDietPlanBook({ title, content, status = "active" } = {}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: normalizeTitle(title),
    content: normalizeContent(content),
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

  return toDietPlanBookPublic(item);
}

async function getDietPlanBookById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return Item ? toDietPlanBookPublic(Item) : null;
}

async function getDietPlanBookRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return Item || null;
}

async function updateDietPlanBook(id, updates) {
  const entries = [];
  if (updates.title !== undefined) entries.push(["title", normalizeTitle(updates.title)]);
  if (updates.content !== undefined) entries.push(["content", normalizeContent(updates.content)]);
  if (updates.status !== undefined) entries.push(["status", normalizeStatus(updates.status)]);

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = value;
    setExpr += `, #${key} = :${key}`;
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

  return toDietPlanBookPublic(Attributes || null);
}

async function deleteDietPlanBook(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listDietPlanBook({ page = 1, limit = 200, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchTerm = String(search || "").trim();
  const searching = Boolean(searchTerm);

  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusIndex",
    partitionKeyValue: normalizedStatus || undefined,
    scanIndexForward: true,
    page: searching ? 1 : page,
    limit: searching ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: searching ? Number.MAX_SAFE_INTEGER : 200,
    sortFn: sortByCreatedAtAsc,
  });

  if (!searching) {
    return {
      plans: result.items.map((row) => toDietPlanBookPublic(row)),
      pagination: result.pagination,
    };
  }

  const filtered = filterItemsBySearch(result.items, {
    search: searchTerm,
    searchFields: ["title", "content"],
  });
  const paged = paginateItems(filtered, page, limit, 200);
  return {
    plans: paged.items.map((row) => toDietPlanBookPublic(row)),
    pagination: paged.pagination,
  };
}

module.exports = {
  TABLE,
  TITLE_MIN_LEN,
  TITLE_MAX_LEN,
  CONTENT_MAX_LEN,
  createDietPlanBook,
  getDietPlanBookById,
  getDietPlanBookRecordById,
  updateDietPlanBook,
  deleteDietPlanBook,
  listDietPlanBook,
  toDietPlanBookPublic,
  normalizeStatus,
};
