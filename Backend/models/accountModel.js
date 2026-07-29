const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
} = require("./userModel");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");
const { toPublicProfile } = require("../utils/toPublicProfile");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");
const { roleHasCarePermissions } = require("../config/permissionCatalog");

const TABLE = "Accounts";
const ALLOWED_STATUS = new Set(["active", "inactive", "blocked"]);
const ALLOWED_APPROVAL_STATUS = new Set(["pending", "approved", "rejected"]);
const ACCOUNT_KINDS = new Set(["admin", "coach", "assistant"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeApprovalStatus(value, fallback = null) {
  if (value == null || value === "") return fallback;
  const next = String(value).toLowerCase().trim();
  return ALLOWED_APPROVAL_STATUS.has(next) ? next : fallback;
}

function normalizeVisibleFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return Boolean(fallback);
}

function normalizeAccountKind(value, fallback = "admin") {
  const next = String(value || fallback).toLowerCase().trim();
  return ACCOUNT_KINDS.has(next) ? next : fallback;
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key");
  }
  return objectKey;
}

/**
 * Derive cached accountKind for an Accounts row from hierarchy + role permissions.
 * Roles no longer carry accountKind — coach/assistant are dynamic.
 */
function deriveAccountKindFromRole(role, { parentAccountId } = {}) {
  if (parentAccountId) return "assistant";
  if (roleHasCarePermissions(role)) return "coach";
  return "admin";
}

/**
 * Logical panel type used by scoped user lists / JWT compatibility.
 * 1) parentAccountId → assistant
 * 2) role care permissions → coach
 * 3) else accountKind / legacy coach fields → coach or admin
 */
function deriveAccountType(account, role = null) {
  if (!account) return "admin";
  if (account.isSuperAdmin) return "admin";

  if (account.parentAccountId) {
    return "assistant_wellness_coach";
  }

  if (roleHasCarePermissions(role)) {
    return "wellness_coach";
  }

  const kind = account.accountKind ? normalizeAccountKind(account.accountKind, "") : "";
  if (kind === "assistant") return "assistant_wellness_coach";
  if (kind === "coach") return "wellness_coach";
  if (kind === "admin") return "admin";

  // Legacy heuristic for migrated coach rows without accountKind yet.
  if (account.referralCode || account.specializationId || account.approvalStatus) {
    return "wellness_coach";
  }
  return "admin";
}

function toPublicAccount(account) {
  if (!account) return null;
  const pub = toPublicProfile({ ...account, _id: account.id });
  if (pub?.profileImage) pub.profileImage = resolvePublicUrl(pub.profileImage);
  if (pub) {
    pub.accountType = deriveAccountType(account);
    pub.wellnessCoachId = account.parentAccountId || null;
  }
  return pub;
}

function buildAccountItem(input, { id, now } = {}) {
  const phoneCountryCode = input.phoneCountryCode
    ? normalizeCountryCode(input.phoneCountryCode)
    : null;
  const phone = input.phone != null ? normalizePhone(input.phone) : null;
  const email = normalizeEmail(input.email);
  const isSuperAdmin = Boolean(input.isSuperAdmin);
  const accountKind = isSuperAdmin
    ? "admin"
    : normalizeAccountKind(input.accountKind, input.parentAccountId ? "assistant" : "admin");

  const item = {
    id: id || uuidv4(),
    name: String(input.name || "").trim(),
    email,
    password: input.password != null ? String(input.password) : null,
    phone: phone || null,
    phoneCountryCode: phoneCountryCode || null,
    phoneKey: phone && phoneCountryCode ? buildPhoneKey(phoneCountryCode, phone) : null,
    profileImage:
      input.profileImage != null ? normalizeProfileImageField(input.profileImage) : null,
    status: normalizeStatus(input.status),
    isSuperAdmin,
    accountKind,
    bio: input.bio != null ? String(input.bio).trim() || null : null,
    designation: input.designation != null ? String(input.designation).trim() || null : null,
    specializationId:
      input.specializationId != null ? String(input.specializationId).trim() || null : null,
    country: input.country != null ? String(input.country).trim() || null : null,
    state: input.state != null ? String(input.state).trim() || null : null,
    city: input.city != null ? String(input.city).trim() || null : null,
    webVisible: normalizeVisibleFlag(input.webVisible, true),
    appVisible: normalizeVisibleFlag(input.appVisible, true),
    fcmId: input.fcmId != null ? String(input.fcmId).trim() || null : null,
    createdAt: now,
    updatedAt: now,
  };

  const approvalStatus = normalizeApprovalStatus(input.approvalStatus, null);
  if (approvalStatus) item.approvalStatus = approvalStatus;

  const parentAccountId =
    input.parentAccountId != null ? String(input.parentAccountId).trim() || null : null;
  if (parentAccountId) {
    item.parentAccountId = parentAccountId;
    item.accountKind = "assistant";
  }

  if (!isSuperAdmin && input.roleId) {
    item.roleId = String(input.roleId).trim();
  }

  if (input.referralCode != null && String(input.referralCode).trim()) {
    item.referralCode = String(input.referralCode).trim().toUpperCase();
  }

  // Drop null phoneKey — GSI keys cannot be null.
  if (!item.phoneKey) delete item.phoneKey;
  if (!item.phoneCountryCode) delete item.phoneCountryCode;
  if (!item.specializationId) delete item.specializationId;

  return item;
}

async function createAccount(fields) {
  const now = new Date().toISOString();
  const item = buildAccountItem(fields, { now });

  if (!item.name) throw new Error("name is required");
  if (!item.email) throw new Error("email is required");
  if (!item.password) throw new Error("password is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getAccountById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id: String(id).trim() },
    })
  );
  return Item || null;
}

async function getAccountByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalized },
      Limit: 1,
    })
  );
  return Items?.[0] || null;
}

async function getAccountByPhone(phoneCountryCode, phone) {
  const phoneKey = buildPhoneKey(normalizeCountryCode(phoneCountryCode), normalizePhone(phone));
  if (!phoneKey) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "PhoneKeyIndex",
      KeyConditionExpression: "phoneKey = :phoneKey",
      ExpressionAttributeValues: { ":phoneKey": phoneKey },
      Limit: 1,
    })
  );
  return Items?.[0] || null;
}

function sanitizeUpdateField(key, value) {
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return normalizePhone(value);
  if (key === "phoneCountryCode") return normalizeCountryCode(value);
  if (key === "status") return normalizeStatus(value);
  if (key === "approvalStatus") return normalizeApprovalStatus(value, "approved");
  if (key === "webVisible" || key === "appVisible") return normalizeVisibleFlag(value, true);
  if (key === "isSuperAdmin") return Boolean(value);
  if (key === "accountKind") return normalizeAccountKind(value, "admin");
  if (key === "profileImage") return normalizeProfileImageField(value);
  if (key === "roleId" || key === "parentAccountId" || key === "specializationId") {
    if (value == null || value === "") return null;
    return String(value).trim() || null;
  }
  if (["name", "bio", "designation", "country", "state", "city", "referralCode", "fcmId"].includes(key)) {
    const s = value == null ? "" : String(value).trim();
    return key === "referralCode" ? (s ? s.toUpperCase() : null) : s || null;
  }
  if (key === "password") return value != null ? String(value) : null;
  return value;
}

async function updateAccount(id, updates) {
  const blocked = new Set(["id", "_id", "createdAt", "phoneKey"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blocked.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const current = await getAccountById(id);
  if (!current) {
    const err = new Error("Account not found");
    err.name = "NotFoundError";
    throw err;
  }

  const merged = { ...current };
  const removeAttrs = [];
  for (const [k, v] of entries) {
    if (
      (k === "roleId" || k === "parentAccountId" || k === "specializationId" || k === "phoneKey") &&
      (v === null || v === "")
    ) {
      removeAttrs.push(k);
      delete merged[k];
      continue;
    }
    merged[k] = v;
  }

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    const cc = merged.phoneCountryCode || "+91";
    const ph = merged.phone;
    if (ph) merged.phoneKey = buildPhoneKey(cc, ph);
    else {
      removeAttrs.push("phoneKey");
      delete merged.phoneKey;
    }
  }

  const patchKeys = entries.map(([k]) => k).filter((k) => !removeAttrs.includes(k));
  if (patchKeys.includes("phone") || patchKeys.includes("phoneCountryCode")) {
    if (merged.phoneKey) patchKeys.push("phoneKey");
  }

  const uniquePatch = [...new Set(patchKeys)];
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const key of uniquePatch) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    setExpr += `, #${key} = :${key}`;
  }

  let updateExpression = setExpr;
  if (removeAttrs.length > 0) {
    for (const key of [...new Set(removeAttrs)]) {
      exprNames[`#${key}`] = key;
    }
    updateExpression += ` REMOVE ${[...new Set(removeAttrs)].map((k) => `#${k}`).join(", ")}`;
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
  return Attributes || null;
}

async function deleteAccount(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
  return { deleted: true };
}

async function listAccounts({
  page = 1,
  limit = 20,
  status,
  search,
  accountKind,
  parentAccountId,
  roleId,
  includeSuperAdmins = true,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedRoleId = roleId != null && String(roleId).trim() ? String(roleId).trim() : "";
  const searchFilter = buildContainsFilter(["name", "email", "phone"], search);
  const exprNames = { ...(searchFilter.exprNames || {}) };
  const exprValues = { ...(searchFilter.exprValues || {}) };
  let filterExpression = searchFilter.filterExpression;

  if (!includeSuperAdmins) {
    exprNames["#isSuperAdmin"] = "isSuperAdmin";
    exprValues[":isSuperAdminFalse"] = false;
    filterExpression = appendFilter(filterExpression, "#isSuperAdmin = :isSuperAdminFalse");
  }

  if (accountKind) {
    exprNames["#accountKind"] = "accountKind";
    exprValues[":accountKind"] = normalizeAccountKind(accountKind);
    filterExpression = appendFilter(filterExpression, "#accountKind = :accountKind");
  }

  if (parentAccountId) {
    const { items, pagination } = await listByPartitionKey({
      tableName: TABLE,
      indexName: "ParentAccountIndex",
      partitionKeyName: "parentAccountId",
      partitionKeyValue: String(parentAccountId).trim(),
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
    return { accounts: items, pagination };
  }

  if (normalizedRoleId) {
    if (normalizedStatus) {
      exprNames["#status"] = "status";
      exprValues[":status"] = normalizedStatus;
      filterExpression = appendFilter(filterExpression, "#status = :status");
    }
    const { items, pagination } = await listByPartitionKey({
      tableName: TABLE,
      indexName: "RoleIdIndex",
      partitionKeyName: "roleId",
      partitionKeyValue: normalizedRoleId,
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
    return { accounts: items, pagination };
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

  return { accounts: items, pagination };
}

async function listChildAccounts(parentAccountId, opts = {}) {
  return listAccounts({ ...opts, parentAccountId });
}

async function countAccountsByRoleId(roleId) {
  if (!roleId) return 0;
  let total = 0;
  let lastKey;
  do {
    const { Count, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "roleId = :roleId",
        ExpressionAttributeValues: { ":roleId": roleId },
        Select: "COUNT",
        ExclusiveStartKey: lastKey,
      })
    );
    total += Count || 0;
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return total;
}

async function putAccountRaw(item) {
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

module.exports = {
  TABLE,
  ACCOUNT_KINDS,
  createAccount,
  getAccountById,
  getAccountByEmail,
  getAccountByPhone,
  updateAccount,
  deleteAccount,
  listAccounts,
  listChildAccounts,
  countAccountsByRoleId,
  toPublicAccount,
  deriveAccountType,
  deriveAccountKindFromRole,
  buildAccountItem,
  putAccountRaw,
  normalizeStatus,
  normalizeApprovalStatus,
  normalizeVisibleFlag,
  normalizeAccountKind,
};
