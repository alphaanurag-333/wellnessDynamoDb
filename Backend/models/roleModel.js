const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { listByPartitionKey, buildContainsFilter, sortByCreatedAtDesc } = require("../utils/dynamoList");

const TABLE = "Role";
const STATUS = new Set(["active", "inactive"]);
const SCOPES = new Set(["ADMIN", "COACH"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeScope(value, fallback = "ADMIN") {
  const next = String(value || fallback).toUpperCase().trim();
  return SCOPES.has(next) ? next : fallback;
}

function normalizeSlug(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizePermissions(value) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((v) => String(v || "").trim()).filter(Boolean)));
}

function toPublicRole(role) {
  if (!role) return null;
  return {
    ...role,
    scope: normalizeScope(role.scope, "ADMIN"),
  };
}

async function createRole({ name, slug, permissions = [], status = "active", scope = "ADMIN" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    slug: normalizeSlug(slug || name),
    permissions: normalizePermissions(permissions),
    status: normalizeStatus(status),
    scope: normalizeScope(scope, "ADMIN"),
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
  return toPublicRole(item);
}

async function getRoleById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return Item ? toPublicRole(Item) : null;
}

async function getRoleBySlug(slug, { scope } = {}) {
  const normalized = normalizeSlug(slug);
  if (!normalized) return null;

  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "SlugIndex",
      KeyConditionExpression: "slug = :slug",
      ExpressionAttributeValues: { ":slug": normalized },
    })
  );
  const rows = Items || [];
  if (!scope) {
    return rows[0] ? toPublicRole(rows[0]) : null;
  }
  const want = normalizeScope(scope, "ADMIN");
  const match = rows.find((row) => normalizeScope(row.scope, "ADMIN") === want);
  return match ? toPublicRole(match) : null;
}

async function updateRole(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, v]) => v !== undefined);
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    let nextValue = value;
    if (key === "slug") nextValue = normalizeSlug(value);
    if (key === "permissions") nextValue = normalizePermissions(value);
    if (key === "status") nextValue = normalizeStatus(value);
    if (key === "scope") nextValue = normalizeScope(value, "ADMIN");
    if (key === "name") nextValue = String(value || "").trim();

    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = nextValue;
    setExpr += `, #${key} = :${key}`;
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
  return toPublicRole(Attributes || null);
}

async function deleteRole(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
  return { deleted: true };
}

async function listRoles({ page = 1, limit = 20, status, search, scope } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "slug"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...(searchFilter.exprNames || {}) };
  const exprValues = { ...(searchFilter.exprValues || {}) };

  if (scope) {
    const normalizedScope = normalizeScope(scope, "ADMIN");
    exprNames["#scope"] = "scope";
    exprValues[":scope"] = normalizedScope;
    // Legacy ADMIN roles may omit `scope`; treat missing as ADMIN.
    const scopeExpr =
      normalizedScope === "ADMIN"
        ? "(attribute_not_exists(#scope) OR #scope = :scope)"
        : "#scope = :scope";
    filterExpression = filterExpression ? `(${filterExpression}) AND (${scopeExpr})` : scopeExpr;
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
    roles: items.map((row) => toPublicRole(row)),
    pagination,
  };
}

module.exports = {
  createRole,
  getRoleById,
  getRoleBySlug,
  updateRole,
  deleteRole,
  listRoles,
  toPublicRole,
  normalizeSlug,
  normalizePermissions,
  normalizeScope,
  SCOPES,
};
