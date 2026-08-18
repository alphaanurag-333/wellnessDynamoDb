const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "BlogMedia";
const MEDIA_FIELDS = ["image"];
const STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "inactive") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeVersionCount(value, fallback = 1) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(Math.floor(n), 999);
}

function formatFileSize(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n <= 0) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicBlogMedia(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const resolved = resolveMediaFields(row, MEDIA_FIELDS);
  return {
    ...resolved,
    owner: String(resolved.owner || "Admin").trim() || "Admin",
    fileSize: String(resolved.fileSize || "").trim(),
    fileSizeLabel: formatFileSize(resolved.fileSizeBytes) || String(resolved.fileSize || "").trim(),
    versions: normalizeVersionCount(resolved.versions, 1),
  };
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "versions") return normalizeVersionCount(value);
  if (key === "fileSizeBytes") {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }
  if (key === "image") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, "image");
  }
  if (["title", "owner", "fileSize"].includes(key)) return String(value || "").trim();
  return value;
}

async function createBlogMedia({
  title = "",
  owner = "Admin",
  image,
  status = "inactive",
  fileSize = "",
  fileSizeBytes = 0,
  versions = 1,
} = {}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "Blog cover").trim() || "Blog cover",
    owner: String(owner || "Admin").trim() || "Admin",
    image: image ? normalizeMediaField(image, "image") : "",
    status: normalizeStatus(status),
    fileSize: String(fileSize || formatFileSize(fileSizeBytes)).trim(),
    fileSizeBytes: Number.isFinite(Number(fileSizeBytes)) ? Math.floor(Number(fileSizeBytes)) : 0,
    versions: normalizeVersionCount(versions, 1),
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

  return toPublicBlogMedia(item);
}

async function getBlogMediaRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getBlogMediaById(id) {
  const item = await getBlogMediaRecordById(id);
  return item ? toPublicBlogMedia(item) : null;
}

async function updateBlogMedia(id, updates) {
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

  return toPublicBlogMedia(Attributes || null);
}

async function deleteBlogMedia(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listBlogMedia({ page = 1, limit = 50, status, owner, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedOwner = String(owner || "").trim();
  const searchFilter = buildContainsFilter(["title", "owner"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedOwner) {
    exprNames["#owner"] = "owner";
    exprValues[":owner"] = normalizedOwner;
    filterExpression = appendFilter(filterExpression, "#owner = :owner");
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
    media: items.map((row) => toPublicBlogMedia(row)),
    pagination,
  };
}

module.exports = {
  createBlogMedia,
  getBlogMediaById,
  getBlogMediaRecordById,
  updateBlogMedia,
  deleteBlogMedia,
  listBlogMedia,
  normalizeStatus,
  toPublicBlogMedia,
  formatFileSize,
};
