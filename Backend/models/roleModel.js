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
const SCOPES = new Set(["ADMIN", "COACH", "ASSISTANT", "TRAINEE", "SUPPORT", "CONSOLE"]);

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

async function createRole({
  name,
  slug,
  permissions = [],
  status = "active",
  scope = "ADMIN",
  description = null,
  roleKey = null,
  inheritsFromRoleId = null,
  navSections = null,
  dataScope = null,
  locked = false,
  uiMeta = null,
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    slug: normalizeSlug(slug || name),
    permissions: normalizePermissions(permissions),
    status: normalizeStatus(status),
    scope: normalizeScope(scope, "ADMIN"),
    locked: Boolean(locked),
    createdAt: now,
    updatedAt: now,
  };
  if (description != null && String(description).trim()) {
    item.description = String(description).trim();
  }
  if (roleKey != null && String(roleKey).trim()) {
    item.roleKey = String(roleKey).trim().toLowerCase();
  }
  if (inheritsFromRoleId != null && String(inheritsFromRoleId).trim()) {
    item.inheritsFromRoleId = String(inheritsFromRoleId).trim();
  }
  if (Array.isArray(navSections)) {
    item.navSections = navSections.map((s) => String(s || "").trim()).filter(Boolean);
  }
  if (dataScope != null && String(dataScope).trim()) {
    item.dataScope = String(dataScope).trim().toLowerCase();
  }
  if (uiMeta && typeof uiMeta === "object") {
    item.uiMeta = uiMeta;
  }

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
    if (key === "description") {
      nextValue = value == null || value === "" ? null : String(value).trim();
    }
    if (key === "roleKey") {
      nextValue = value == null || value === "" ? null : String(value).trim().toLowerCase();
    }
    if (key === "inheritsFromRoleId") {
      nextValue = value == null || value === "" ? null : String(value).trim();
    }
    if (key === "navSections") {
      nextValue = Array.isArray(value)
        ? value.map((s) => String(s || "").trim()).filter(Boolean)
        : [];
    }
    if (key === "dataScope") {
      nextValue = value == null || value === "" ? null : String(value).trim().toLowerCase();
    }
    if (key === "locked") nextValue = Boolean(value);

    // DynamoDB cannot SET null on all attrs cleanly for sparse — use REMOVE for nulls
    if (nextValue === null && ["description", "roleKey", "inheritsFromRoleId", "dataScope"].includes(key)) {
      continue; // handled below via remove list
    }

    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = nextValue;
    setExpr += `, #${key} = :${key}`;
  }

  const removeKeys = [];
  for (const [key, value] of entries) {
    if (
      value === null &&
      ["description", "roleKey", "inheritsFromRoleId", "dataScope"].includes(key)
    ) {
      exprNames[`#${key}`] = key;
      removeKeys.push(`#${key}`);
    }
  }

  let updateExpression = setExpr;
  if (removeKeys.length) {
    updateExpression += ` REMOVE ${removeKeys.join(", ")}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
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
