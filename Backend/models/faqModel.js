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

const TABLE = "Faq";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function sortFaqsByOrder(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

async function listAllFaqsUnpaged() {
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortFaqsByOrder,
  });
  return result.items || [];
}

async function nextSortOrder() {
  const items = await listAllFaqsUnpaged();
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => {
    const order = normalizeSortOrder(item.sortOrder, 0);
    return order > acc ? order : acc;
  }, 0);
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createFaq({ question, answer, status = "active", sortOrder } = {}) {
  const now = new Date().toISOString();
  const resolvedOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? await nextSortOrder()
      : normalizeSortOrder(sortOrder);

  const item = {
    id: uuidv4(),
    question: String(question || "").trim(),
    answer: String(answer || "").trim(),
    status: normalizeStatus(status),
    sortOrder: resolvedOrder,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

  return item;
}

async function getFaqById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return Item || null;
}

async function updateFaq(id, updates) {
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
    exprValues[v] = key === "sortOrder" ? normalizeSortOrder(value) : value;
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

  return Attributes || null;
}

async function deleteFaq(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listFaqs({ page = 1, limit = 20, status, search } = {}) {
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
    sortFn: sortFaqsByOrder,
  });

  if (!searching) {
    return { faqs: result.items, pagination: result.pagination };
  }

  const filtered = filterItemsBySearch(result.items, {
    search: searchTerm,
    searchFields: ["question", "answer"],
  });
  const paged = paginateItems(filtered, page, limit, 200);
  return { faqs: paged.items, pagination: paged.pagination };
}

/**
 * Persist display order. `orderedIds` is the full list in desired order (1-based sortOrder).
 */
async function reorderFaqs(orderedIds = []) {
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (!ids.length) {
    throw new Error("orderedIds is required");
  }

  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error("orderedIds must be unique");
  }

  const existing = await listAllFaqsUnpaged();
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const id of ids) {
    if (!byId.has(id)) {
      const err = new Error(`FAQ not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
  }

  const updated = await Promise.all(
    ids.map((id, index) => updateFaq(id, { sortOrder: index + 1 })),
  );

  return updated.sort(sortFaqsByOrder);
}

module.exports = {
  createFaq,
  getFaqById,
  updateFaq,
  deleteFaq,
  listFaqs,
  reorderFaqs,
  normalizeStatus,
  normalizeSortOrder,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
};
