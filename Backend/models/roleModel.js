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
const { ACCOUNT_TYPES } = require("../config/staffPermissionCatalog");

const TABLE = "Role";
const STATUS = new Set(["active", "inactive"]);
const SCOPES = new Set(["ADMIN", "COACH"]);
const ACCOUNT_TYPE_SET = new Set(ACCOUNT_TYPES);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeScope(value, fallback = "ADMIN") {
  const next = String(value || fallback).toUpperCase().trim();
  return SCOPES.has(next) ? next : fallback;
}

/**
 * `accountTypes` is the unified replacement for `scope`: the staff account
 * type(s) a role is assignable to. `scope` is kept in parallel (derived when
 * omitted) purely for backward compatibility with code that has not yet been
 * migrated off it (`Backend/config/coachPermissionCatalog.js` consumers,
 * pre-M6 admin controllers) — new code should read `accountTypes`.
 */
function normalizeAccountTypes(value, fallbackScope = "ADMIN") {
  if (Array.isArray(value) && value.length > 0) {
    const cleaned = Array.from(
      new Set(value.map((v) => String(v || "").trim()).filter((v) => ACCOUNT_TYPE_SET.has(v)))
    );
    if (cleaned.length > 0) return cleaned;
  }
  // Derive from legacy scope when accountTypes is absent/empty.
  return normalizeScope(fallbackScope, "ADMIN") === "COACH"
    ? ["wellness_coach", "assistant_wellness_coach"]
    : ["admin"];
}

/** Legacy `scope` derived from `accountTypes` for rows/writers still reading `scope`. */
function scopeFromAccountTypes(accountTypes) {
  const types = Array.isArray(accountTypes) ? accountTypes : [];
  return types.includes("admin") ? "ADMIN" : "COACH";
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
  const scope = normalizeScope(role.scope, "ADMIN");
  return {
    ...role,
    scope,
    accountTypes: normalizeAccountTypes(role.accountTypes, scope),
  };
}

/** Whether a role is assignable to the given staff account type. */
function roleTargetsAccountType(role, accountType) {
  const types = normalizeAccountTypes(role?.accountTypes, role?.scope);
  return types.includes(String(accountType || ""));
}

async function createRole({
  name,
  slug,
  permissions = [],
  status = "active",
  scope,
  accountTypes,
}) {
  const now = new Date().toISOString();
  const resolvedAccountTypes = normalizeAccountTypes(accountTypes, scope || "ADMIN");
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    slug: normalizeSlug(slug || name),
    permissions: normalizePermissions(permissions),
    status: normalizeStatus(status),
    scope: scope !== undefined ? normalizeScope(scope, "ADMIN") : scopeFromAccountTypes(resolvedAccountTypes),
    accountTypes: resolvedAccountTypes,
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
    if (key === "accountTypes") nextValue = normalizeAccountTypes(value, "ADMIN");
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

async function listRoles({ page = 1, limit = 20, status, search, scope, accountType } = {}) {
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

  let rows = items.map((row) => toPublicRole(row));
  // accountType is a plain attribute (not a GSI key) — filter in memory. Role
  // counts are small enough that this is cheap and avoids a 7th GSI.
  if (accountType) {
    rows = rows.filter((role) => role.accountTypes.includes(accountType));
  }

  return {
    roles: rows,
    pagination: accountType ? { ...pagination, total: rows.length } : pagination,
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
  roleTargetsAccountType,
  normalizeSlug,
  normalizePermissions,
  normalizeScope,
  normalizeAccountTypes,
  scopeFromAccountTypes,
  SCOPES,
  ACCOUNT_TYPES,
};
