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

const TABLE = "ProgramCatalog";
const ALLOWED_STATUS = ["active", "inactive"];
const PROGRAM_TYPES = new Set(["goal_based", "lifetime"]);
const STATUS = new Set(ALLOWED_STATUS);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeProgramType(value, fallback = "goal_based") {
  const next = String(value || fallback).toLowerCase().trim();
  return PROGRAM_TYPES.has(next) ? next : fallback;
}

function normalizeTitle(value) {
  const title = String(value || "").trim();
  if (!title) {
    const err = new Error("title is required");
    err.name = "ValidationError";
    throw err;
  }
  if (title.length > 200) {
    const err = new Error("title cannot exceed 200 characters");
    err.name = "ValidationError";
    throw err;
  }
  return title;
}

function normalizeDescription(value) {
  if (value === undefined || value === null) return "";
  const description = String(value).trim();
  if (description.length > 2000) {
    const err = new Error("description cannot exceed 2000 characters");
    err.name = "ValidationError";
    throw err;
  }
  return description;
}

function normalizePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    const err = new Error("price must be a positive number");
    err.name = "ValidationError";
    throw err;
  }
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

function toProgramCatalogPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const status = normalizeStatus(row.status);
  return {
    id: row.id,
    _id: row._id,
    title: row.title,
    programType: normalizeProgramType(row.programType),
    description: row.description || "",
    price: Number(row.price) || 0,
    currency: String(row.currency || "INR").toUpperCase(),
    isActive: status === "active",
    status,
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function snapshotCatalogProgram(item) {
  const pub = toProgramCatalogPublic(item);
  if (!pub) return null;
  return {
    catalogProgramId: pub.id,
    title: pub.title,
    programType: pub.programType,
    description: pub.description,
    price: pub.price,
    currency: pub.currency,
  };
}

async function createProgramCatalog({
  title,
  programType = "goal_based",
  description = "",
  price,
  currency = "INR",
  isActive = true,
  createdBy,
}) {
  const now = new Date().toISOString();
  const status = isActive === false ? "inactive" : "active";
  const item = {
    id: uuidv4(),
    title: normalizeTitle(title),
    programType: normalizeProgramType(programType),
    description: normalizeDescription(description),
    price: normalizePrice(price),
    currency: String(currency || "INR").toUpperCase(),
    status,
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

  return toProgramCatalogPublic(item);
}

async function getProgramCatalogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getProgramCatalogById(id) {
  const item = await getProgramCatalogRecordById(id);
  return item ? toProgramCatalogPublic(item) : null;
}

async function listActiveProgramCatalog() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: false,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: (a, b) => String(a.title || "").localeCompare(String(b.title || "")),
  });
  return items.map((row) => toProgramCatalogPublic(row)).filter(Boolean);
}

async function listProgramCatalog({ page = 1, limit = 10, status, search, isActive } = {}) {
  let normalizedStatus = status ? normalizeStatus(status, "") : "";
  if (isActive === true || isActive === "true") normalizedStatus = "active";
  if (isActive === false || isActive === "false") normalizedStatus = "inactive";

  const searchFilter = buildContainsFilter(["title", "programType", "description"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    programs: items.map((row) => toProgramCatalogPublic(row)),
    pagination,
  };
}

async function updateProgramCatalog(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "createdBy"]);
  const entries = [];

  for (const [key, value] of Object.entries(updates || {})) {
    if (blockedFields.has(key) || value === undefined) continue;
    if (key === "title") entries.push([key, normalizeTitle(value)]);
    else if (key === "programType") entries.push([key, normalizeProgramType(value)]);
    else if (key === "description") entries.push([key, normalizeDescription(value)]);
    else if (key === "price") entries.push([key, normalizePrice(value)]);
    else if (key === "currency") entries.push([key, String(value || "INR").toUpperCase()]);
    else if (key === "status") entries.push([key, normalizeStatus(value)]);
    else if (key === "isActive") {
      entries.push(["status", value === true || value === "true" ? "active" : "inactive"]);
    } else entries.push([key, value]);
  }

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
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

  return toProgramCatalogPublic(Attributes || null);
}

async function deleteProgramCatalog(id) {
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
  PROGRAM_TYPES,
  normalizeStatus,
  normalizeProgramType,
  normalizePrice,
  toProgramCatalogPublic,
  snapshotCatalogProgram,
  createProgramCatalog,
  getProgramCatalogById,
  getProgramCatalogRecordById,
  listActiveProgramCatalog,
  listProgramCatalog,
  updateProgramCatalog,
  deleteProgramCatalog,
};
