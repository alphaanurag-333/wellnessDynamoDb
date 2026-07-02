const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "TestCatalog";
const ALLOWED_STATUS = ["active", "inactive"];
const ALLOWED_TYPES = ["PROFILE", "SINGLE"];
const STATUS = new Set(ALLOWED_STATUS);
const TYPES = new Set(ALLOWED_TYPES);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "SINGLE") {
  const next = String(value || fallback).toUpperCase().trim();
  return TYPES.has(next) ? next : fallback;
}

function normalizeTestId(value) {
  const testId = slugify(value);
  if (!testId) {
    const err = new Error("testId is required");
    err.name = "ValidationError";
    throw err;
  }
  if (testId.length > 80) {
    const err = new Error("testId cannot exceed 80 characters");
    err.name = "ValidationError";
    throw err;
  }
  return testId;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  if (!name) {
    const err = new Error("name is required");
    err.name = "ValidationError";
    throw err;
  }
  if (name.length > 200) {
    const err = new Error("name cannot exceed 200 characters");
    err.name = "ValidationError";
    throw err;
  }
  return name;
}

function normalizeCategory(value) {
  const category = String(value || "").trim();
  if (!category) {
    const err = new Error("category is required");
    err.name = "ValidationError";
    throw err;
  }
  if (category.length > 100) {
    const err = new Error("category cannot exceed 100 characters");
    err.name = "ValidationError";
    throw err;
  }
  return category;
}

function normalizeSequence(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function normalizeParameters(parameters) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    const err = new Error("At least one parameter is required");
    err.name = "ValidationError";
    throw err;
  }

  return parameters.map((param, index) => {
    const name = String(param?.name || "").trim();
    if (!name) {
      const err = new Error(`Parameter ${index + 1}: name is required`);
      err.name = "ValidationError";
      throw err;
    }
    const paramId = normalizeTestId(param?.paramId || name);
    const unit = String(param?.unit || "").trim();
    const refRange = String(param?.refRange || "").trim();
    return {
      paramId,
      name,
      unit: unit || "—",
      refRange: refRange || "—",
      sequence: normalizeSequence(param?.sequence, index + 1),
    };
  });
}

function toTestCatalogPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    testId: row.testId,
    name: row.name,
    type: normalizeType(row.type),
    category: row.category,
    status: normalizeStatus(row.status),
    parameters: Array.isArray(row.parameters) ? row.parameters : [],
    sequence: normalizeSequence(row.sequence),
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function snapshotTest(item) {
  const pub = toTestCatalogPublic(item);
  if (!pub) return null;
  return {
    testId: pub.testId,
    name: pub.name,
    type: pub.type,
    category: pub.category,
    parameters: pub.parameters,
  };
}

async function getTestCatalogByTestId(testId) {
  const slug = normalizeTestId(testId);
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "TestIdIndex",
      KeyConditionExpression: "#testId = :testId",
      ExpressionAttributeNames: { "#testId": "testId" },
      ExpressionAttributeValues: { ":testId": slug },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function createTestCatalog({
  testId,
  name,
  type = "SINGLE",
  category,
  status = "active",
  parameters,
  sequence = 0,
  createdBy,
}) {
  const slug = normalizeTestId(testId || name);
  const existing = await getTestCatalogByTestId(slug);
  if (existing) {
    const err = new Error("testId already exists");
    err.name = "ConflictError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    testId: slug,
    name: normalizeName(name),
    type: normalizeType(type),
    category: normalizeCategory(category),
    status: normalizeStatus(status),
    parameters: normalizeParameters(parameters),
    sequence: normalizeSequence(sequence),
    createdBy: String(createdBy || "").trim() || null,
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

  return toTestCatalogPublic(item);
}

async function getTestCatalogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getTestCatalogById(id) {
  const item = await getTestCatalogRecordById(id);
  return item ? toTestCatalogPublic(item) : null;
}

async function getActiveTestCatalogByIds(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((id) => getTestCatalogRecordById(id)));
  return results
    .filter((item) => item && normalizeStatus(item.status) === "active")
    .map((item) => toTestCatalogPublic(item))
    .filter(Boolean);
}

async function listActiveTestCatalog() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: (a, b) => {
      const seqDiff = normalizeSequence(a.sequence) - normalizeSequence(b.sequence);
      if (seqDiff !== 0) return seqDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    },
  });
  return items.map((row) => toTestCatalogPublic(row)).filter(Boolean);
}

async function listActiveTestCatalogPaginated({ page = 1, limit = 12, search, category } = {}) {
  const searchFilter = buildContainsFilter(["name", "testId", "category"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (category) {
    const catKey = "#category";
    exprNames[catKey] = "category";
    exprValues[":category"] = String(category).trim();
    filterExpression = filterExpression
      ? `${filterExpression} AND ${catKey} = :category`
      : `${catKey} = :category`;
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 50,
    sortFn: (a, b) => {
      const seqDiff = normalizeSequence(a.sequence) - normalizeSequence(b.sequence);
      if (seqDiff !== 0) return seqDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    },
  });

  return {
    tests: items.map((row) => toTestCatalogPublic(row)).filter(Boolean),
    pagination,
  };
}

async function listTestCatalog({ page = 1, limit = 10, status, search, category } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "testId", "category"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (category) {
    const catKey = "#category";
    exprNames[catKey] = "category";
    exprValues[":category"] = String(category).trim();
    filterExpression = filterExpression
      ? `${filterExpression} AND ${catKey} = :category`
      : `${catKey} = :category`;
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
    tests: items.map((row) => toTestCatalogPublic(row)),
    pagination,
  };
}

async function updateTestCatalog(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "createdBy"]);
  const entries = [];

  for (const [key, value] of Object.entries(updates || {})) {
    if (blockedFields.has(key) || value === undefined) continue;
    if (key === "status") entries.push([key, normalizeStatus(value)]);
    else if (key === "type") entries.push([key, normalizeType(value)]);
    else if (key === "name") entries.push([key, normalizeName(value)]);
    else if (key === "category") entries.push([key, normalizeCategory(value)]);
    else if (key === "sequence") entries.push([key, normalizeSequence(value)]);
    else if (key === "parameters") entries.push([key, normalizeParameters(value)]);
    else if (key === "testId") entries.push([key, normalizeTestId(value)]);
    else entries.push([key, value]);
  }

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const testIdUpdate = entries.find(([k]) => k === "testId");
  if (testIdUpdate) {
    const existing = await getTestCatalogByTestId(testIdUpdate[1]);
    if (existing && existing.id !== id) {
      const err = new Error("testId already exists");
      err.name = "ConflictError";
      throw err;
    }
  }

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

  return toTestCatalogPublic(Attributes || null);
}

async function deleteTestCatalog(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  ALLOWED_TYPES,
  slugify,
  normalizeStatus,
  normalizeType,
  normalizeTestId,
  normalizeParameters,
  toTestCatalogPublic,
  snapshotTest,
  createTestCatalog,
  getTestCatalogById,
  getTestCatalogRecordById,
  getTestCatalogByTestId,
  getActiveTestCatalogByIds,
  listActiveTestCatalog,
  listActiveTestCatalogPaginated,
  listTestCatalog,
  updateTestCatalog,
  deleteTestCatalog,
};
