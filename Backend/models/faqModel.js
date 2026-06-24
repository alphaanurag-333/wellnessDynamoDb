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
  sortByCreatedAtDesc,
  paginateItems,
  filterItemsBySearch,
} = require("../utils/dynamoList");

const TABLE = "Faq";
const ALLOWED_STATUS = new Set(["active", "inactive"]);

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

async function createFaq({ question, answer, status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    question: String(question || "").trim(),
    answer: String(answer || "").trim(),
    status: normalizeStatus(status),
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
    exprValues[v] = value;
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
    scanIndexForward: false,
    page: searching ? 1 : page,
    limit: searching ? Number.MAX_SAFE_INTEGER : limit,
    maxLimit: searching ? Number.MAX_SAFE_INTEGER : 200,
    sortFn: sortByCreatedAtDesc,
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

module.exports = {
  createFaq,
  getFaqById,
  updateFaq,
  deleteFaq,
  listFaqs,
  normalizeStatus,
};
