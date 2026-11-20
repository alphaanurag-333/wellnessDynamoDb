const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolvePublicUrl } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
} = require("../utils/dynamoList");

const TABLE = "Supplement";
const SUPPLEMENT_ALLOWED_STATUS = ["active", "inactive"];
const SUPPLEMENT_ALLOWED_UNITS = ["Caps", "Tablets", "Softgels", "Sachets", "ml", "g", "mg", "Drops"];
const STATUS = new Set(SUPPLEMENT_ALLOWED_STATUS);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Case-insensitive uniqueness key for nutrition names. */
function normalizeNameKey(name) {
  return String(name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function sortByNameAsc(a, b) {
  const byName = String(a?.name || "").localeCompare(String(b?.name || ""), undefined, {
    sensitivity: "base",
  });
  if (byName !== 0) return byName;
  return String(a?.id || "").localeCompare(String(b?.id || ""));
}

function duplicateNameError(name) {
  const err = new Error(`A nutrition named "${String(name || "").trim()}" already exists`);
  err.code = "DUPLICATE_SUPPLEMENT_NAME";
  return err;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicSupplement(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  if (row.image) row.image = resolvePublicUrl(row.image);
  return row;
}

async function listAllSupplementsUnpaged() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
  });
  return items || [];
}

async function findSupplementByName(name, { excludeId } = {}) {
  const key = normalizeNameKey(name);
  if (!key) return null;
  const exclude = String(excludeId || "").trim();
  const rows = await listAllSupplementsUnpaged();
  return (
    rows.find((row) => {
      if (exclude && String(row.id || "") === exclude) return false;
      return normalizeNameKey(row.name) === key;
    }) || null
  );
}

async function assertUniqueSupplementName(name, { excludeId } = {}) {
  const existing = await findSupplementByName(name, { excludeId });
  if (existing) throw duplicateNameError(name);
}

async function createSupplement({
  name,
  description,
  packSize,
  unit,
  price,
  image,
  status = "active",
}) {
  const trimmedName = String(name || "").trim();
  await assertUniqueSupplementName(trimmedName);

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: trimmedName,
    description: String(description || "").trim(),
    packSize: normalizeNumber(packSize),
    unit: String(unit || "").trim(),
    price: normalizeNumber(price),
    image: normalizeMediaField(image, "image"),
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return toPublicSupplement(item);
}

async function getSupplementRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getSupplementById(id) {
  const item = await getSupplementRecordById(id);
  return item ? toPublicSupplement(item) : null;
}

async function updateSupplement(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {}).filter(
    ([k, v]) => !blockedFields.has(k) && v !== undefined
  );
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const nameUpdate = entries.find(([k]) => k === "name");
  if (nameUpdate) {
    await assertUniqueSupplementName(nameUpdate[1], { excludeId: id });
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    if (k === "image") {
      exprValues[`:${k}`] = normalizeMediaField(v, "image");
    } else if (k === "packSize" || k === "price") {
      exprValues[`:${k}`] = normalizeNumber(v);
    } else if (k === "status") {
      exprValues[`:${k}`] = normalizeStatus(v);
    } else {
      exprValues[`:${k}`] = typeof v === "string" ? v.trim() : v;
    }
    setExpr += `, #${k} = :${k}`;
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
  return toPublicSupplement(Attributes || null);
}

async function deleteSupplement(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listActiveSupplements() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: sortByNameAsc,
  });
  return items.map((row) => toPublicSupplement(row)).filter(Boolean);
}

async function getActiveSupplementsByIds(ids) {
  const uniqueIds = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (uniqueIds.length === 0) return [];
  const supplements = await Promise.all(uniqueIds.map((id) => getSupplementById(id)));
  return supplements.filter(
    (row) => row && String(row.status || "").toLowerCase() === "active"
  );
}

function snapshotSupplement(supplement) {
  if (!supplement) return null;
  return {
    supplementId: String(supplement.id || supplement._id || "").trim(),
    name: String(supplement.name || "").trim(),
    unit: String(supplement.unit || "").trim(),
    packSize: normalizeNumber(supplement.packSize),
    price: normalizeNumber(supplement.price),
  };
}

async function listSupplements({ page = 1, limit = 10, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "description"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByNameAsc,
  });

  return {
    supplements: items.map((row) => toPublicSupplement(row)),
    pagination,
  };
}

module.exports = {
  SUPPLEMENT_ALLOWED_STATUS,
  SUPPLEMENT_ALLOWED_UNITS,
  normalizeStatus,
  normalizeNameKey,
  createSupplement,
  getSupplementById,
  getSupplementRecordById,
  findSupplementByName,
  updateSupplement,
  deleteSupplement,
  listSupplements,
  listActiveSupplements,
  getActiveSupplementsByIds,
  snapshotSupplement,
};
