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

const TABLE = "Sop";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_CATEGORIES = new Set([
  "onboarding",
  "escalation",
  "nutrition",
  "reviews",
  "payments",
]);

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeCategory(category, fallback = "onboarding") {
  const next = String(category || fallback).toLowerCase().trim();
  return ALLOWED_CATEGORIES.has(next) ? next : fallback;
}

function normalizeSteps(steps) {
  if (Array.isArray(steps)) {
    return steps.map((s) => String(s || "").trim()).filter(Boolean);
  }
  if (typeof steps === "string") {
    return steps
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function toPublicSop(item) {
  if (!item) return null;
  const steps = Array.isArray(item.steps) ? item.steps : [];
  return {
    ...item,
    steps,
    stepCount: steps.length,
  };
}

async function createSop({
  title,
  category = "onboarding",
  steps = [],
  author = "Admin desk",
  status = "active",
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    category: normalizeCategory(category),
    steps: normalizeSteps(steps),
    author: String(author || "Admin desk").trim() || "Admin desk",
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

  return toPublicSop(item);
}

async function getSopById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return toPublicSop(Item || null);
}

async function updateSop(id, updates) {
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

  return toPublicSop(Attributes || null);
}

async function deleteSop(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listSops({ page = 1, limit = 50, status, category, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedCategory = category ? normalizeCategory(category, "") : "";
  const searchTerm = String(search || "").trim();
  const searching = Boolean(searchTerm) || Boolean(normalizedCategory);

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

  let items = result.items.map(toPublicSop);

  if (normalizedCategory) {
    items = items.filter((item) => item.category === normalizedCategory);
  }

  if (searchTerm) {
    items = filterItemsBySearch(items, {
      search: searchTerm,
      searchFields: ["title", "category", "author", "steps"],
    });
  }

  if (!searching) {
    return { sops: items, pagination: result.pagination };
  }

  const paged = paginateItems(items, page, limit, 200);
  return { sops: paged.items, pagination: paged.pagination };
}

module.exports = {
  TABLE,
  ALLOWED_CATEGORIES,
  createSop,
  getSopById,
  updateSop,
  deleteSop,
  listSops,
  normalizeStatus,
  normalizeCategory,
  normalizeSteps,
};
