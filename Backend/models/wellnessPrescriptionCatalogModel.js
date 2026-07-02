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

const TABLE = "WellnessPrescriptionCatalog";
const ALLOWED_STATUS = ["active", "inactive"];
const STATUS = new Set(ALLOWED_STATUS);

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

function normalizePrescriptionId(value) {
  const prescriptionId = slugify(value);
  if (!prescriptionId) {
    const err = new Error("prescriptionId is required");
    err.name = "ValidationError";
    throw err;
  }
  if (prescriptionId.length > 80) {
    const err = new Error("prescriptionId cannot exceed 80 characters");
    err.name = "ValidationError";
    throw err;
  }
  return prescriptionId;
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

function normalizePoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    const err = new Error("At least one recommendation point is required");
    err.name = "ValidationError";
    throw err;
  }

  return points.map((point, index) => {
    const text = String(point ?? "").trim();
    if (!text) {
      const err = new Error(`Point ${index + 1}: text is required`);
      err.name = "ValidationError";
      throw err;
    }
    if (text.length > 2000) {
      const err = new Error(`Point ${index + 1}: cannot exceed 2000 characters`);
      err.name = "ValidationError";
      throw err;
    }
    return text;
  });
}

function toWellnessPrescriptionCatalogPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    prescriptionId: row.prescriptionId,
    title: row.title,
    category: row.category,
    points: Array.isArray(row.points) ? row.points : [],
    status: normalizeStatus(row.status),
    sequence: normalizeSequence(row.sequence),
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function snapshotPrescription(item) {
  const pub = toWellnessPrescriptionCatalogPublic(item);
  if (!pub) return null;
  return {
    prescriptionId: pub.prescriptionId,
    title: pub.title,
    category: pub.category,
    points: pub.points,
  };
}

async function getWellnessPrescriptionCatalogByPrescriptionId(prescriptionId) {
  const slug = normalizePrescriptionId(prescriptionId);
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "PrescriptionIdIndex",
      KeyConditionExpression: "#prescriptionId = :prescriptionId",
      ExpressionAttributeNames: { "#prescriptionId": "prescriptionId" },
      ExpressionAttributeValues: { ":prescriptionId": slug },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function createWellnessPrescriptionCatalog({
  prescriptionId,
  title,
  category,
  points,
  status = "active",
  sequence = 0,
  createdBy,
}) {
  const slug = normalizePrescriptionId(prescriptionId || title);
  const existing = await getWellnessPrescriptionCatalogByPrescriptionId(slug);
  if (existing) {
    const err = new Error("prescriptionId already exists");
    err.name = "ConflictError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    prescriptionId: slug,
    title: normalizeTitle(title),
    category: normalizeCategory(category),
    points: normalizePoints(points),
    status: normalizeStatus(status),
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

  return toWellnessPrescriptionCatalogPublic(item);
}

async function getWellnessPrescriptionCatalogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getWellnessPrescriptionCatalogById(id) {
  const item = await getWellnessPrescriptionCatalogRecordById(id);
  return item ? toWellnessPrescriptionCatalogPublic(item) : null;
}

async function getActiveWellnessPrescriptionCatalogByIds(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const results = await Promise.all(
    unique.map((id) => getWellnessPrescriptionCatalogRecordById(id))
  );
  return results
    .filter((item) => item && normalizeStatus(item.status) === "active")
    .map((item) => toWellnessPrescriptionCatalogPublic(item))
    .filter(Boolean);
}

async function listActiveWellnessPrescriptionCatalog() {
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
      return String(a.title || "").localeCompare(String(b.title || ""));
    },
  });
  return items.map((row) => toWellnessPrescriptionCatalogPublic(row)).filter(Boolean);
}

async function listActiveWellnessPrescriptionCatalogPaginated({
  page = 1,
  limit = 12,
  search,
  category,
} = {}) {
  const searchFilter = buildContainsFilter(
    ["title", "prescriptionId", "category"],
    search
  );
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
      return String(a.title || "").localeCompare(String(b.title || ""));
    },
  });

  return {
    prescriptions: items.map((row) => toWellnessPrescriptionCatalogPublic(row)).filter(Boolean),
    pagination,
  };
}

async function listWellnessPrescriptionCatalog({
  page = 1,
  limit = 10,
  status,
  search,
  category,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(
    ["title", "prescriptionId", "category"],
    search
  );
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
    prescriptions: items.map((row) => toWellnessPrescriptionCatalogPublic(row)),
    pagination,
  };
}

async function updateWellnessPrescriptionCatalog(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "createdBy"]);
  const entries = [];

  for (const [key, value] of Object.entries(updates || {})) {
    if (blockedFields.has(key) || value === undefined) continue;
    if (key === "status") entries.push([key, normalizeStatus(value)]);
    else if (key === "title") entries.push([key, normalizeTitle(value)]);
    else if (key === "category") entries.push([key, normalizeCategory(value)]);
    else if (key === "sequence") entries.push([key, normalizeSequence(value)]);
    else if (key === "points") entries.push([key, normalizePoints(value)]);
    else if (key === "prescriptionId") entries.push([key, normalizePrescriptionId(value)]);
    else entries.push([key, value]);
  }

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const prescriptionIdUpdate = entries.find(([k]) => k === "prescriptionId");
  if (prescriptionIdUpdate) {
    const existing = await getWellnessPrescriptionCatalogByPrescriptionId(
      prescriptionIdUpdate[1]
    );
    if (existing && existing.id !== id) {
      const err = new Error("prescriptionId already exists");
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

  return toWellnessPrescriptionCatalogPublic(Attributes || null);
}

async function deleteWellnessPrescriptionCatalog(id) {
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
  slugify,
  normalizeStatus,
  normalizePrescriptionId,
  normalizePoints,
  toWellnessPrescriptionCatalogPublic,
  snapshotPrescription,
  createWellnessPrescriptionCatalog,
  getWellnessPrescriptionCatalogById,
  getWellnessPrescriptionCatalogRecordById,
  getWellnessPrescriptionCatalogByPrescriptionId,
  getActiveWellnessPrescriptionCatalogByIds,
  listActiveWellnessPrescriptionCatalog,
  listActiveWellnessPrescriptionCatalogPaginated,
  listWellnessPrescriptionCatalog,
  updateWellnessPrescriptionCatalog,
  deleteWellnessPrescriptionCatalog,
};
