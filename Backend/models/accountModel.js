const {
  PutCommand,
  GetCommand,
  UpdateCommand,
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
const { normalizeNullableMediaField, resolvePublicUrl } = require("../utils/s3");
const { toPublicProfile } = require("../utils/toPublicProfile");
const { normalizeCoachContent, toPublicCoachContent } = require("../utils/coachContent");
const {
  listByPartitionKey,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");
const { normalizeRoleKey, ACCOUNT_ROLE_KEYS } = require("../config/accountRoles");

const TABLE = "Account";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_APPROVAL = new Set(["pending", "approved", "rejected"]);
const MEMBERSHIP_STATUS = new Set(["active", "inactive"]);

/** Roles that may carry a hierarchy parent on the membership. */
const PARENT_MEMBERSHIP_ROLE_KEYS = new Set(["assistant_wellness_coach", "trainee"]);

/** Top-level attrs that must never be stored as null on a GSI key (sparse REMOVE). */
const SPARSE_GSI_ATTRS = new Set([
  "specializationId",
  "parentAccountId",
  "approvalStatus",
  "phoneKey",
  "roleId",
]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeApprovalStatus(value, fallback = "approved") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_APPROVAL.has(next) ? next : fallback;
}

/** Missing attributes count as visible so older rows stay listed until backfill. */
function normalizeVisibleFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return Boolean(fallback);
}

function normalizeMembershipStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return MEMBERSHIP_STATUS.has(next) ? next : fallback;
}

function normalizeNullableString(value) {
  if (value == null) return null;
  const s = String(value).trim();
  return s || null;
}

/**
 * Normalize a single membership entry.
 * @returns {{ roleKey: string, roleId: string|null, permissionOverrides: object|null, status: string, parentAccountId: string|null, grantedAt: string }}
 */
function normalizeMembership(input) {
  if (!input || typeof input !== "object") {
    throw new Error("membership must be an object");
  }

  const roleKey = normalizeRoleKey(input.roleKey);
  if (!roleKey) {
    throw new Error(
      `membership.roleKey must be one of: ${ACCOUNT_ROLE_KEYS.join(", ")}`
    );
  }

  let permissionOverrides = null;
  if (
    input.permissionOverrides != null &&
    typeof input.permissionOverrides === "object" &&
    !Array.isArray(input.permissionOverrides) &&
    Object.keys(input.permissionOverrides).length > 0
  ) {
    permissionOverrides = input.permissionOverrides;
  }

  const parentAccountId = normalizeNullableString(input.parentAccountId);
  const grantedAt =
    input.grantedAt != null && String(input.grantedAt).trim()
      ? String(input.grantedAt).trim()
      : new Date().toISOString();

  return {
    roleKey,
    roleId: normalizeNullableString(input.roleId),
    permissionOverrides,
    status: normalizeMembershipStatus(input.status),
    parentAccountId,
    grantedAt,
  };
}

function stripNullGsiKeys(item) {
  for (const key of SPARSE_GSI_ATTRS) {
    if (item[key] == null || item[key] === "") {
      delete item[key];
    }
  }
  return item;
}

function normalizeAccountDateOfBirth(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * Derive denormalized fields from memberships and strip null sparse GSI keys.
 * Mutates and returns `item`.
 */
function syncDerivedFields(item) {
  if (!item || typeof item !== "object") return item;

  const memberships = Array.isArray(item.memberships) ? item.memberships : [];
  const roleKeys = [];
  const seen = new Set();
  for (const m of memberships) {
    const key = normalizeRoleKey(m?.roleKey);
    if (key && !seen.has(key)) {
      seen.add(key);
      roleKeys.push(key);
    }
  }
  item.roleKeys = roleKeys;

  // Prefer assistant parent, then trainee, then first membership with a parent.
  let parentAccountId = null;
  for (const preferred of ["assistant_wellness_coach", "trainee"]) {
    const hit = memberships.find(
      (m) =>
        normalizeRoleKey(m?.roleKey) === preferred &&
        normalizeNullableString(m?.parentAccountId)
    );
    if (hit) {
      parentAccountId = normalizeNullableString(hit.parentAccountId);
      break;
    }
  }
  if (!parentAccountId) {
    const anyParent = memberships.find((m) => normalizeNullableString(m?.parentAccountId));
    if (anyParent) parentAccountId = normalizeNullableString(anyParent.parentAccountId);
  }
  if (parentAccountId) {
    item.parentAccountId = parentAccountId;
  } else {
    delete item.parentAccountId;
  }

  if (item.phoneKey === "" || item.phoneKey == null) {
    delete item.phoneKey;
  }

  return stripNullGsiKeys(item);
}

function buildAccountItem(input, { id, now } = {}) {
  const stamp = now || new Date().toISOString();
  const phoneCountryCode = normalizeCountryCode(input.phoneCountryCode);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);
  const phoneKey = buildPhoneKey(phoneCountryCode, phone);

  const memberships = Array.isArray(input.memberships)
    ? input.memberships.map((m) => normalizeMembership(m))
    : [];

  const defaultRoleKeyRaw = input.defaultRoleKey != null ? normalizeRoleKey(input.defaultRoleKey) : null;

  const item = {
    id: id || uuidv4(),
    name: String(input.name || "").trim(),
    email,
    password: input.password != null ? String(input.password) : null,
    phoneCountryCode,
    phone: phone || null,
    phoneKey: phoneKey || null,
    profileImage:
      input.profileImage != null
        ? normalizeNullableMediaField(input.profileImage, "profileImage")
        : null,
    bio: normalizeNullableString(input.bio),
    address: normalizeNullableString(input.address),
    specializationId: normalizeNullableString(input.specializationId),
    country: normalizeNullableString(input.country),
    state: normalizeNullableString(input.state),
    city: normalizeNullableString(input.city),
    dateOfBirth: normalizeAccountDateOfBirth(input.dateOfBirth ?? input.dob),
    fcmId: normalizeNullableString(input.fcmId),
    status: normalizeStatus(input.status),
    approvalStatus:
      input.approvalStatus != null
        ? normalizeApprovalStatus(input.approvalStatus, input._defaultApproval || "approved")
        : null,
    webVisible: normalizeVisibleFlag(input.webVisible, true),
    appVisible: normalizeVisibleFlag(input.appVisible, true),
    aiEnabled: normalizeVisibleFlag(input.aiEnabled, true),
    referralCode:
      input.referralCode != null
        ? String(input.referralCode).trim().toUpperCase() || null
        : null,
    designation: normalizeNullableString(input.designation),
    isSuperAdmin: Boolean(input.isSuperAdmin),
    memberships,
    roleKeys: [],
    defaultRoleKey: defaultRoleKeyRaw,
    sourceLegacyType: normalizeNullableString(input.sourceLegacyType),
    legacySources: Array.isArray(input.legacySources) ? input.legacySources : null,
    coach_content: normalizeCoachContent(input.coach_content),
    otp: input.otp != null ? String(input.otp) : null,
    otpExpire: input.otpExpire != null && input.otpExpire !== "" ? String(input.otpExpire) : null,
    resetPasswordToken: input.resetPasswordToken != null ? String(input.resetPasswordToken) : null,
    resetPasswordExpire:
      input.resetPasswordExpire != null && input.resetPasswordExpire !== ""
        ? String(input.resetPasswordExpire)
        : null,
    totpSecret:
      input.totpSecret != null && String(input.totpSecret).trim()
        ? String(input.totpSecret).trim()
        : null,
    totpRequired: Boolean(input.totpRequired),
    totpVerifiedAt:
      input.totpVerifiedAt != null && String(input.totpVerifiedAt).trim()
        ? String(input.totpVerifiedAt).trim()
        : null,
    createdAt: stamp,
    updatedAt: stamp,
  };

  if (input.parentAccountId != null) {
    item.parentAccountId = normalizeNullableString(input.parentAccountId);
  }

  return syncDerivedFields(item);
}

function toPublicAccount(account) {
  if (!account) return null;
  const pub = toPublicProfile(account);
  if (!pub) return null;
  if (pub.profileImage) pub.profileImage = resolvePublicUrl(pub.profileImage);
  if (!Array.isArray(pub.memberships)) pub.memberships = [];
  if (!Array.isArray(pub.roleKeys)) {
    pub.roleKeys = pub.memberships
      .map((m) => normalizeRoleKey(m?.roleKey))
      .filter(Boolean);
  }
  pub.aiEnabled = normalizeVisibleFlag(account.aiEnabled, true);
  pub.totpRequired = Boolean(account.totpRequired);
  pub.totpConfigured = Boolean(account.totpSecret);
  if (account.totpVerifiedAt) pub.totpVerifiedAt = account.totpVerifiedAt;
  pub.coach_content = toPublicCoachContent(account.coach_content);
  return pub;
}

function getMembership(account, roleKey) {
  const key = normalizeRoleKey(roleKey);
  if (!key || !account || !Array.isArray(account.memberships)) return null;
  return account.memberships.find((m) => normalizeRoleKey(m?.roleKey) === key) || null;
}

function hasActiveMembership(account, roleKey) {
  const membership = getMembership(account, roleKey);
  if (!membership) return false;
  return normalizeMembershipStatus(membership.status) === "active";
}

function sanitizeUpdateField(key, value) {
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return normalizePhone(value);
  if (key === "phoneCountryCode") return normalizeCountryCode(value);
  if (key === "status") return normalizeStatus(value);
  if (key === "approvalStatus") {
    if (value == null || value === "") return null;
    return normalizeApprovalStatus(value);
  }
  if (key === "webVisible" || key === "appVisible" || key === "aiEnabled") return normalizeVisibleFlag(value, true);
  if (key === "totpRequired") return Boolean(value);
  if (key === "totpSecret") {
    if (value == null || value === "") return null;
    return String(value).trim() || null;
  }
  if (key === "totpVerifiedAt") {
    if (value == null || value === "") return null;
    return String(value).trim() || null;
  }
  if (key === "isSuperAdmin") return Boolean(value);
  if (key === "defaultRoleKey") {
    if (value == null || value === "") return null;
    return normalizeRoleKey(value);
  }
  if (key === "profileImage") {
    return normalizeNullableMediaField(value, "profileImage");
  }
  if (key === "dateOfBirth" || key === "dob") {
    return normalizeAccountDateOfBirth(value);
  }
  if (key === "specializationId" || key === "parentAccountId" || key === "roleId") {
    return normalizeNullableString(value);
  }
  if (
    [
      "name",
      "bio",
      "address",
      "country",
      "state",
      "city",
      "fcmId",
      "designation",
      "referralCode",
      "sourceLegacyType",
    ].includes(key)
  ) {
    if (key === "referralCode" && value != null) {
      return String(value).trim().toUpperCase() || null;
    }
    return normalizeNullableString(value);
  }
  if (key === "password") {
    return value != null ? String(value) : null;
  }
  if (key === "otp") {
    return value != null ? String(value) : null;
  }
  if (key === "otpExpire" || key === "resetPasswordExpire") {
    return value != null && value !== "" ? String(value) : null;
  }
  if (key === "resetPasswordToken") {
    return value != null ? String(value) : null;
  }
  if (key === "memberships") {
    if (!Array.isArray(value)) throw new Error("memberships must be an array");
    return value.map((m) => normalizeMembership(m));
  }
  if (key === "legacySources") {
    return Array.isArray(value) ? value : null;
  }
  if (key === "permissionOverrides") {
    if (value == null) return null;
    if (typeof value !== "object" || Array.isArray(value)) return null;
    return value;
  }
  if (key === "coach_content") {
    return normalizeCoachContent(value);
  }
  return value;
}

async function createAccount(input) {
  const raw = input || {};
  const now = new Date().toISOString();
  const item = buildAccountItem(raw, {
    id: raw.id || undefined,
    now: raw.createdAt || now,
  });
  if (raw.updatedAt != null && String(raw.updatedAt).trim()) {
    item.updatedAt = String(raw.updatedAt).trim();
  }

  if (!item.name) throw new Error("name is required");
  if (!item.email) throw new Error("email is required");

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
      Key: { id },
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
  const item = Items?.[0] || null;
  if (item && String(item.status || "").toLowerCase() === "deleted") return null;
  return item;
}

async function getAccountByPhone(phoneCountryCode, phone) {
  const phoneKey = buildPhoneKey(phoneCountryCode, phone);
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
  const item = Items?.[0] || null;
  if (item && String(item.status || "").toLowerCase() === "deleted") return null;
  return item;
}

async function updateAccount(id, updates) {
  if (!updates || typeof updates !== "object") {
    throw new Error("updates must be a non-null object");
  }

  const blocked = new Set(["id", "_id", "createdAt", "phoneKey", "roleKeys", "parentAccountId"]);
  const entries = Object.entries(updates)
    .filter(([k, v]) => !blocked.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  // Allow explicit parentAccountId override when provided (then sync may overwrite from memberships).
  if (updates.parentAccountId !== undefined) {
    entries.push(["parentAccountId", sanitizeUpdateField("parentAccountId", updates.parentAccountId)]);
  }

  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const current = await getAccountById(id);
  if (!current) {
    const err = new Error("Account not found");
    err.name = "NotFoundError";
    throw err;
  }

  const merged = { ...current };
  const removeAttrs = [];

  for (const [k, v] of entries) {
    if (SPARSE_GSI_ATTRS.has(k) && (v === null || v === "")) {
      removeAttrs.push(k);
      delete merged[k];
      continue;
    }
    if (
      (k === "permissionOverrides" || k === "defaultRoleKey" || k === "legacySources") &&
      (v === null || v === "")
    ) {
      removeAttrs.push(k);
      delete merged[k];
      continue;
    }
    merged[k] = v;
  }

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    const nextKey = buildPhoneKey(merged.phoneCountryCode, merged.phone);
    if (nextKey) {
      merged.phoneKey = nextKey;
    } else {
      removeAttrs.push("phoneKey");
      delete merged.phoneKey;
    }
  }

  // Re-derive roleKeys / parentAccountId from memberships whenever memberships change
  // or when callers did not force parentAccountId alone without membership context.
  syncDerivedFields(merged);

  // After sync, ensure sparse GSI attrs that are absent are REMOVEd (not SET null).
  for (const key of SPARSE_GSI_ATTRS) {
    if (merged[key] == null || merged[key] === "") {
      if (!removeAttrs.includes(key)) removeAttrs.push(key);
      delete merged[key];
    }
  }

  const patchKeys = new Set(
    entries
      .map(([k]) => k)
      .filter((k) => !removeAttrs.includes(k))
  );
  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    if (merged.phoneKey) patchKeys.add("phoneKey");
  }
  // Always persist derived fields when memberships change.
  if (updates.memberships !== undefined || removeAttrs.includes("parentAccountId") || merged.parentAccountId) {
    patchKeys.add("roleKeys");
    if (merged.parentAccountId) {
      patchKeys.add("parentAccountId");
      // If we are SETting parentAccountId, do not REMOVE it.
      const idx = removeAttrs.indexOf("parentAccountId");
      if (idx >= 0) removeAttrs.splice(idx, 1);
    } else if (!removeAttrs.includes("parentAccountId")) {
      removeAttrs.push("parentAccountId");
    }
  } else {
    patchKeys.add("roleKeys");
    if (merged.parentAccountId) {
      patchKeys.add("parentAccountId");
    } else if (!removeAttrs.includes("parentAccountId")) {
      removeAttrs.push("parentAccountId");
    }
  }

  // Drop keys that are being REMOVEd from SET list.
  for (const key of removeAttrs) {
    patchKeys.delete(key);
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const key of patchKeys) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    setExpr += `, #${key} = :${key}`;
  }

  let updateExpression = setExpr;
  const uniqueRemove = [...new Set(removeAttrs)];
  if (uniqueRemove.length > 0) {
    for (const key of uniqueRemove) {
      exprNames[`#${key}`] = key;
    }
    updateExpression += ` REMOVE ${uniqueRemove.map((k) => `#${k}`).join(", ")}`;
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

/**
 * Soft-delete an Account (Teams / staff). Keeps the row for audit; clears login identifiers
 * so email/phone can be reused. Does not hard-delete.
 */
async function deleteAccount(id) {
  const current = await getAccountById(id);
  if (!current) {
    const err = new Error("Account not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (String(current.status || "").toLowerCase() === "deleted") {
    return current;
  }

  const now = new Date().toISOString();
  const memberships = (Array.isArray(current.memberships) ? current.memberships : []).map((m) => ({
    ...m,
    status: "inactive",
  }));

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET #status = :deleted, deletedAt = :deletedAt, updatedAt = :updatedAt, " +
        "memberships = :memberships, " +
        "deletedEmail = if_not_exists(email, :empty), " +
        "deletedPhoneKey = if_not_exists(phoneKey, :empty) " +
        "REMOVE email, phoneKey, password, otp, otpExpire, resetPasswordToken, " +
        "resetPasswordExpire, totpSecret, totpVerifiedAt, fcmId, profileImage",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":deleted": "deleted",
        ":deletedAt": now,
        ":updatedAt": now,
        ":memberships": memberships,
        ":empty": "",
      },
      ConditionExpression:
        "attribute_exists(id) AND (attribute_not_exists(#status) OR #status <> :deleted)",
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes || { id, status: "deleted", deleted: true };
}

async function addMembership(id, membership) {
  const normalized = normalizeMembership(membership);
  const current = await getAccountById(id);
  if (!current) {
    const err = new Error("Account not found");
    err.name = "NotFoundError";
    throw err;
  }

  const memberships = Array.isArray(current.memberships) ? [...current.memberships] : [];
  const existingIdx = memberships.findIndex(
    (m) => normalizeRoleKey(m?.roleKey) === normalized.roleKey
  );
  if (existingIdx >= 0) {
    memberships[existingIdx] = {
      ...memberships[existingIdx],
      ...normalized,
      grantedAt: memberships[existingIdx].grantedAt || normalized.grantedAt,
    };
  } else {
    memberships.push(normalized);
  }

  return updateAccount(id, { memberships });
}

async function removeMembership(id, roleKey) {
  const key = normalizeRoleKey(roleKey);
  if (!key) throw new Error("roleKey is required");

  const current = await getAccountById(id);
  if (!current) {
    const err = new Error("Account not found");
    err.name = "NotFoundError";
    throw err;
  }

  const memberships = Array.isArray(current.memberships) ? [...current.memberships] : [];
  const idx = memberships.findIndex((m) => normalizeRoleKey(m?.roleKey) === key);
  if (idx < 0) {
    return current;
  }

  // Soft-deactivate the membership (keeps history; gates switch-role via status).
  memberships[idx] = {
    ...memberships[idx],
    status: "inactive",
  };

  return updateAccount(id, { memberships });
}

/**
 * List accounts. Prefer the most selective GSI when a dedicated partition key is provided.
 */
async function listAccounts({
  status,
  search,
  page = 1,
  limit = 20,
  roleKey,
  approvalStatus,
  parentAccountId,
  specializationId,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedApproval = approvalStatus ? normalizeApprovalStatus(approvalStatus, "") : "";
  const normalizedRoleKey = roleKey ? normalizeRoleKey(roleKey) : null;
  const parentId = normalizeNullableString(parentAccountId);
  const specId = normalizeNullableString(specializationId);
  const searchTerm = String(search || "").trim();
  const searchFields = ["name", "email", "phone", "specializationId", "designation"];

  let indexName = "StatusCreatedAtIndex";
  let partitionKeyName = "status";
  let partitionKeyValue = normalizedStatus || undefined;
  let statusPartitions = ["active", "inactive"];

  if (parentId) {
    indexName = "ParentAccountIndex";
    partitionKeyName = "parentAccountId";
    partitionKeyValue = parentId;
    statusPartitions = undefined;
  } else if (specId) {
    indexName = "SpecializationIdIndex";
    partitionKeyName = "specializationId";
    partitionKeyValue = specId;
    statusPartitions = undefined;
  } else if (normalizedApproval && !normalizedStatus) {
    indexName = "ApprovalStatusIndex";
    partitionKeyName = "approvalStatus";
    partitionKeyValue = normalizedApproval;
    statusPartitions = undefined;
  }

  let filterExpression = null;
  const exprNames = {};
  const exprValues = {};

  // Soft-deleted staff stay in Dynamo for audit but must not appear in team/hierarchy lists.
  if (!normalizedStatus && partitionKeyName !== "status") {
    exprNames["#status"] = "status";
    exprValues[":deletedStatus"] = "deleted";
    filterExpression = appendFilter(
      filterExpression,
      "(attribute_not_exists(#status) OR #status <> :deletedStatus)"
    );
  }

  if (normalizedStatus && partitionKeyName !== "status") {
    exprNames["#status"] = "status";
    exprValues[":status"] = normalizedStatus;
    filterExpression = appendFilter(filterExpression, "#status = :status");
  }

  if (normalizedApproval && partitionKeyName !== "approvalStatus") {
    exprNames["#approvalStatus"] = "approvalStatus";
    exprValues[":approvalStatus"] = normalizedApproval;
    filterExpression = appendFilter(filterExpression, "#approvalStatus = :approvalStatus");
  }

  if (normalizedRoleKey) {
    exprNames["#roleKeys"] = "roleKeys";
    exprValues[":roleKey"] = normalizedRoleKey;
    filterExpression = appendFilter(filterExpression, "contains(#roleKeys, :roleKey)");
  }

  if (specId && partitionKeyName !== "specializationId") {
    exprNames["#specializationId"] = "specializationId";
    exprValues[":specializationId"] = specId;
    filterExpression = appendFilter(filterExpression, "#specializationId = :specializationId");
  }

  if (parentId && partitionKeyName !== "parentAccountId") {
    exprNames["#parentAccountId"] = "parentAccountId";
    exprValues[":parentAccountId"] = parentId;
    filterExpression = appendFilter(filterExpression, "#parentAccountId = :parentAccountId");
  }

  const searchFn = searchTerm
    ? (item, term) => {
        if (String(item.status || "").toLowerCase() === "deleted" && normalizedStatus !== "deleted") {
          return false;
        }
        if (normalizedStatus && normalizeStatus(item.status, "") !== normalizedStatus) return false;
        if (
          normalizedApproval &&
          normalizeApprovalStatus(item.approvalStatus, "") !== normalizedApproval
        ) {
          return false;
        }
        if (normalizedRoleKey) {
          const keys = Array.isArray(item.roleKeys) ? item.roleKeys : [];
          if (!keys.map((k) => normalizeRoleKey(k)).includes(normalizedRoleKey)) return false;
        }
        if (specId && normalizeNullableString(item.specializationId) !== specId) return false;
        if (parentId && normalizeNullableString(item.parentAccountId) !== parentId) return false;
        return searchFields.some((field) =>
          String(item[field] || "")
            .toLowerCase()
            .includes(term)
        );
      }
    : undefined;

  const listOpts = {
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
    filterExpression,
    exprNames,
    exprValues,
    search: searchTerm || null,
    searchFn,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  };
  if (statusPartitions) {
    listOpts.statusPartitions = statusPartitions;
  }

  const { items, pagination } = await listByPartitionKey(listOpts);

  return {
    accounts: items.map((row) => toPublicAccount(row)),
    pagination,
  };
}

async function listAccountsByParentAccountId(parentAccountId, opts = {}) {
  const parentId = normalizeNullableString(parentAccountId);
  if (!parentId) {
    return {
      accounts: [],
      pagination: { page: 1, limit: opts.limit || 20, total: 0, pages: 1 },
    };
  }
  return listAccounts({ ...opts, parentAccountId: parentId });
}

function resolvePrimaryRoleKey(account) {
  if (!account) return null;
  const keys = Array.isArray(account.roleKeys)
    ? account.roleKeys.map((k) => normalizeRoleKey(k)).filter(Boolean)
    : Array.isArray(account.memberships)
      ? account.memberships.map((m) => normalizeRoleKey(m?.roleKey)).filter(Boolean)
      : [];
  if (!keys.length) return null;
  const preferred = normalizeRoleKey(account.defaultRoleKey);
  if (preferred && keys.includes(preferred)) return preferred;
  return keys[0];
}

/** Count active accounts whose primary (default) role matches. Matches Teams/Access member lists. */
async function countAccountsByRoleKey(roleKey, { status = "active", primaryOnly = true } = {}) {
  const key = normalizeRoleKey(roleKey);
  if (!key) return 0;

  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  let total = 0;
  let lastKey;
  do {
    const exprNames = { "#roleKeys": "roleKeys" };
    const exprValues = { ":roleKey": key };
    let filterExpression = "contains(#roleKeys, :roleKey)";
    const projection = ["#roleKeys", "defaultRoleKey", "memberships"];

    if (normalizedStatus) {
      exprNames["#status"] = "status";
      exprValues[":status"] = normalizedStatus;
      filterExpression += " AND #status = :status";
      projection.push("#status");
    }

    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ProjectionExpression: projection.join(", "),
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      if (primaryOnly) {
        if (resolvePrimaryRoleKey(item) !== key) continue;
      }
      total += 1;
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return total;
}

function assignedMembershipRoleId(account, primaryRoleKey) {
  const memberships = Array.isArray(account?.memberships) ? account.memberships : [];
  const primary = normalizeRoleKey(primaryRoleKey) || resolvePrimaryRoleKey(account);
  const match =
    (primary && memberships.find((m) => normalizeRoleKey(m?.roleKey) === primary)) ||
    memberships[0] ||
    null;
  return String(match?.roleId || "").trim();
}

/**
 * Find accounts assigned to a console Role id (membership.roleId).
 * System templates can also include legacy rows with no membership.roleId
 * when accountRoleKey + includeUnassigned are set.
 */
async function findAccountsByConsoleRoleId(
  consoleRoleId,
  { status = "active", accountRoleKey = null, includeUnassigned = false, idsOnly = false } = {}
) {
  const id = String(consoleRoleId || "").trim();
  if (!id) return idsOnly ? 0 : [];

  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const expectedRole = accountRoleKey ? normalizeRoleKey(accountRoleKey) : null;
  const matched = [];
  let total = 0;
  let lastKey;
  do {
    const exprNames = {};
    const exprValues = {};
    let filterExpression;

    if (normalizedStatus) {
      exprNames["#status"] = "status";
      exprValues[":status"] = normalizedStatus;
      filterExpression = "#status = :status";
    }

    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: filterExpression,
        ExpressionAttributeNames: Object.keys(exprNames).length ? exprNames : undefined,
        ExpressionAttributeValues: Object.keys(exprValues).length ? exprValues : undefined,
        ExclusiveStartKey: lastKey,
      })
    );

    for (const item of Items || []) {
      const primary = resolvePrimaryRoleKey(item);
      if (expectedRole && primary !== expectedRole) continue;
      const assignedId = assignedMembershipRoleId(item, primary);
      const hit =
        assignedId === id ||
        (includeUnassigned && !assignedId && expectedRole && primary === expectedRole);
      if (!hit) continue;
      if (idsOnly) total += 1;
      else matched.push(item);
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return idsOnly ? total : matched;
}

/**
 * Count accounts assigned to a console Role id.
 * System templates can also include legacy rows with no membership.roleId
 * when accountRoleKey + includeUnassigned are set.
 */
async function countAccountsByConsoleRoleId(
  consoleRoleId,
  { status = "active", accountRoleKey = null, includeUnassigned = false } = {}
) {
  return findAccountsByConsoleRoleId(consoleRoleId, {
    status,
    accountRoleKey,
    includeUnassigned,
    idsOnly: true,
  });
}

/**
 * List full account rows assigned to a console Role id.
 * Prefer this for custom roles so listing matches memberCountForConsoleRole
 * (membership.roleId), without relying on a derived account roleKey pre-filter.
 */
async function listAccountsByConsoleRoleId(
  consoleRoleId,
  { status = "active", accountRoleKey = null, includeUnassigned = false } = {}
) {
  const rows = await findAccountsByConsoleRoleId(consoleRoleId, {
    status,
    accountRoleKey,
    includeUnassigned,
    idsOnly: false,
  });
  return rows.map((row) => toPublicAccount(row));
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  ALLOWED_APPROVAL,
  MEMBERSHIP_STATUS,
  PARENT_MEMBERSHIP_ROLE_KEYS,
  normalizeStatus,
  normalizeApprovalStatus,
  normalizeVisibleFlag,
  normalizeMembership,
  syncDerivedFields,
  buildAccountItem,
  toPublicAccount,
  createAccount,
  getAccountById,
  getAccountByEmail,
  getAccountByPhone,
  updateAccount,
  deleteAccount,
  listAccounts,
  addMembership,
  removeMembership,
  hasActiveMembership,
  getMembership,
  listAccountsByParentAccountId,
  countAccountsByRoleKey,
  countAccountsByConsoleRoleId,
  listAccountsByConsoleRoleId,
  assignedMembershipRoleId,
};
