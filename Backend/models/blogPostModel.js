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
} = require("../utils/dynamoList");
const { normalizeVisibleFlag, visibilityFilterParts } = require("./wellnessCoachModel");

const TABLE = "BlogPost";
const MEDIA_FIELDS = ["coverImage"];
const STATUS = new Set(["active", "inactive"]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicBlogPost(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const resolved = resolveMediaFields(row, MEDIA_FIELDS);
  return {
    ...resolved,
    sortOrder: normalizeSortOrder(resolved.sortOrder, 9999),
    webVisible: normalizeVisibleFlag(resolved.webVisible, true),
    appVisible: normalizeVisibleFlag(resolved.appVisible, true),
  };
}

function sortBySortOrderAsc(a, b) {
  const orderA = normalizeSortOrder(a?.sortOrder, 9999);
  const orderB = normalizeSortOrder(b?.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  const aTime = new Date(a?.createdAt || 0).getTime();
  const bTime = new Date(b?.createdAt || 0).getTime();
  return bTime - aTime;
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "sortOrder") return normalizeSortOrder(value);
  if (key === "webVisible" || key === "appVisible") return normalizeVisibleFlag(value, true);
  if (key === "coverImage") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, "coverImage");
  }
  if (["title", "description"].includes(key)) return String(value || "").trim();
  return value;
}

async function listAllBlogPostsUnpaged() {
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: false,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortBySortOrderAsc,
  });
  return result.items || [];
}

async function createBlogPost({
  title,
  description = "",
  coverImage = "",
  status = "active",
  sortOrder,
  webVisible = true,
  appVisible = true,
} = {}) {
  const now = new Date().toISOString();
  const existing = await listAllBlogPostsUnpaged();
  const resolvedOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? existing.reduce((max, row) => Math.max(max, normalizeSortOrder(row.sortOrder, 0)), 0) + 1
      : normalizeSortOrder(sortOrder);

  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    coverImage: coverImage ? normalizeMediaField(coverImage, "coverImage") : "",
    status: normalizeStatus(status),
    sortOrder: resolvedOrder,
    webVisible: normalizeVisibleFlag(webVisible, true),
    appVisible: normalizeVisibleFlag(appVisible, true),
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

  return toPublicBlogPost(item);
}

async function getBlogPostRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getBlogPostById(id) {
  const item = await getBlogPostRecordById(id);
  return item ? toPublicBlogPost(item) : null;
}

async function updateBlogPost(id, updates) {
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

  return toPublicBlogPost(Attributes || null);
}

async function deleteBlogPost(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listBlogPosts({
  page = 1,
  limit = 50,
  status,
  search,
  platform,
  webVisible,
  appVisible,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["title", "description"], search);
  const channel = String(platform || "").toLowerCase().trim();
  const wantWebVisible =
    webVisible !== undefined ? webVisible : channel === "web" ? true : undefined;
  const wantAppVisible =
    appVisible !== undefined ? appVisible : channel === "app" ? true : undefined;

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...(searchFilter.exprNames || {}) };
  const exprValues = { ...(searchFilter.exprValues || {}) };
  for (const part of [
    visibilityFilterParts("webVisible", wantWebVisible),
    visibilityFilterParts("appVisible", wantAppVisible),
  ]) {
    if (!part) continue;
    Object.assign(exprNames, part.exprNames);
    Object.assign(exprValues, part.exprValues);
    filterExpression = appendFilter(filterExpression, part.expression);
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
    searchFn: searchFilter.search
      ? (item, term) => {
          if (
            wantWebVisible !== undefined &&
            normalizeVisibleFlag(item.webVisible, true) !== normalizeVisibleFlag(wantWebVisible, true)
          ) {
            return false;
          }
          if (
            wantAppVisible !== undefined &&
            normalizeVisibleFlag(item.appVisible, true) !== normalizeVisibleFlag(wantAppVisible, true)
          ) {
            return false;
          }
          return ["title", "description"].some((field) =>
            String(item[field] || "")
              .toLowerCase()
              .includes(term)
          );
        }
      : undefined,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortBySortOrderAsc,
  });

  return {
    posts: items.map((row) => toPublicBlogPost(row)),
    pagination,
  };
}

async function reorderBlogPosts(orderedIds = []) {
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (!ids.length) throw new Error("orderedIds is required");

  const unique = new Set(ids);
  if (unique.size !== ids.length) throw new Error("orderedIds must be unique");

  const existing = await listAllBlogPostsUnpaged();
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const id of ids) {
    if (!byId.has(id)) {
      const err = new Error(`Blog post not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
  }

  const updated = await Promise.all(
    ids.map((id, index) => updateBlogPost(id, { sortOrder: index + 1 }))
  );

  return updated.sort(sortBySortOrderAsc);
}

module.exports = {
  createBlogPost,
  getBlogPostById,
  getBlogPostRecordById,
  updateBlogPost,
  deleteBlogPost,
  listBlogPosts,
  reorderBlogPosts,
  normalizeStatus,
  normalizeSortOrder,
  normalizeVisibleFlag,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
};
