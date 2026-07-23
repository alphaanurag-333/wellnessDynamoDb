/**
 * Unified `StaffAccount` model — merges Admin, WellnessCoach and
 * AssistantWellnessCoach into one table, keyed by the same `id` values the
 * legacy tables already use (IDs are preserved exactly across the migration,
 * see `Backend/scripts/backfillStaffAccounts.js`).
 *
 * During the M2/M3 dual-write window, the legacy models remain the source of
 * truth and mirror every write here via `mirror*` below. From M4 onward,
 * cutover controllers read/write through this model directly.
 */
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
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
} = require("./userModel");
const { toPublicProfile } = require("../utils/toPublicProfile");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");
const {
  ACCOUNT_TYPES,
  ADMIN,
  WELLNESS_COACH,
  ASSISTANT_WELLNESS_COACH,
  isValidAccountType,
} = require("../config/staffPermissionCatalog");
const { remapLegacyOverrides } = require("../config/staffPermissionSlugMap");

const TABLE = "StaffAccount";
const ALLOWED_STATUS = new Set(["active", "inactive", "blocked"]);
const ALLOWED_APPROVAL_STATUS = new Set(["pending", "approved", "rejected"]);

function normalizeAccountType(value) {
  const next = String(value || "").trim();
  return isValidAccountType(next) ? next : null;
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeApprovalStatus(value, fallback = "approved") {
  const next = String(value || fallback).toLowerCase().trim();
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

function buildAccountTypeStatus(accountType, status) {
  return `${accountType}#${status}`;
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key");
  }
  return objectKey;
}

function toPublicStaffAccount(account) {
  const pub = toPublicProfile(account);
  if (!pub) return null;
  if (pub.profileImage) pub.profileImage = resolvePublicUrl(pub.profileImage);
  return pub;
}

async function getStaffAccountRecordById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return Item || null;
}

async function getStaffAccountById(id) {
  const item = await getStaffAccountRecordById(id);
  return item ? toPublicStaffAccount(item) : null;
}

async function getStaffAccountByEmail(email) {
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

async function getStaffAccountByPhoneKey(phoneCountryCode, phone) {
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
  return Items?.[0] || null;
}

/** Global uniqueness across every staff account type — one email/phone, period. */
async function assertEmailAvailable(email, excludeId) {
  const existing = await getStaffAccountByEmail(email);
  if (existing && existing.id !== excludeId) {
    const err = new Error("An account already exists with this email");
    err.name = "ConflictError";
    throw err;
  }
}

async function assertPhoneAvailable(phoneCountryCode, phone, excludeId) {
  if (!phone) return;
  const existing = await getStaffAccountByPhoneKey(phoneCountryCode, phone);
  if (existing && existing.id !== excludeId) {
    const err = new Error("An account already exists with this phone number");
    err.name = "ConflictError";
    throw err;
  }
}

/**
 * Generic create. `id` may be passed explicitly (backfill preserving legacy
 * IDs / dual-write mirroring) — otherwise a new uuid is generated.
 */
async function createStaffAccount(fields) {
  const accountType = normalizeAccountType(fields.accountType);
  if (!accountType) throw new Error(`accountType must be one of ${ACCOUNT_TYPES.join(", ")}`);

  const now = fields.now || new Date().toISOString();
  const phoneCountryCode = normalizeCountryCode(fields.phoneCountryCode);
  const phone = normalizePhone(fields.phone);
  const status = normalizeStatus(fields.status, "active");

  const item = {
    id: fields.id || uuidv4(),
    accountType,
    accountTypeStatus: buildAccountTypeStatus(accountType, status),
    name: String(fields.name || "").trim(),
    email: normalizeEmail(fields.email),
    phoneCountryCode,
    phone,
    password: fields.password != null ? String(fields.password) : null,
    profileImage: fields.profileImage != null ? normalizeProfileImageField(fields.profileImage) : null,
    status,
    isSuperAdmin: accountType === ADMIN ? Boolean(fields.isSuperAdmin) : false,
    createdAt: fields.createdAt || now,
    updatedAt: fields.updatedAt || now,
  };

  if (phone) item.phoneKey = buildPhoneKey(phoneCountryCode, phone);

  // roleId is a GSI key — omit rather than null (Super Admins have none).
  if (!item.isSuperAdmin && fields.roleId) item.roleId = String(fields.roleId).trim();

  if (accountType === WELLNESS_COACH || accountType === ASSISTANT_WELLNESS_COACH) {
    if (fields.fcmId != null) item.fcmId = String(fields.fcmId).trim() || null;
    if (fields.referralCode != null) item.referralCode = String(fields.referralCode).trim().toUpperCase() || null;
    item.webVisible = normalizeVisibleFlag(fields.webVisible, true);
    item.appVisible = normalizeVisibleFlag(fields.appVisible, true);
  }

  if (accountType === WELLNESS_COACH) {
    item.approvalStatus = normalizeApprovalStatus(fields.approvalStatus, "approved");
    if (fields.specializationId) item.specializationId = String(fields.specializationId).trim();
    if (fields.bio != null) item.bio = String(fields.bio).trim() || null;
    if (fields.country != null) item.country = String(fields.country).trim() || null;
    if (fields.state != null) item.state = String(fields.state).trim() || null;
    if (fields.city != null) item.city = String(fields.city).trim() || null;
    if (
      fields.permissionOverrides &&
      typeof fields.permissionOverrides === "object" &&
      !Array.isArray(fields.permissionOverrides) &&
      Object.keys(fields.permissionOverrides).length > 0
    ) {
      item.permissionOverrides = fields.permissionOverrides;
    }
  }

  if (accountType === ASSISTANT_WELLNESS_COACH) {
    item.wellnessCoachId = String(fields.wellnessCoachId || "").trim();
    if (fields.designation != null) item.designation = String(fields.designation).trim() || null;
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: fields._overwrite ? undefined : "attribute_not_exists(id)",
    })
  );

  return item;
}

/** Upsert used by mirror/backfill writers — always overwrites (no unique-create race). */
async function putStaffAccountRaw(item) {
  await docClient.send(new PutCommand({ TableName: TABLE, Item: item }));
  return item;
}

async function updateStaffAccount(id, updates) {
  const current = await getStaffAccountRecordById(id);
  if (!current) {
    const err = new Error("Staff account not found");
    err.name = "NotFoundError";
    throw err;
  }

  // accountType is immutable after creation (conflict-avoidance safeguard #2 in the plan).
  const blocked = new Set(["id", "accountType", "createdAt"]);
  const entries = Object.entries(updates || {}).filter(([k, v]) => !blocked.has(k) && v !== undefined);
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const merged = { ...current };
  const removeAttrs = [];

  for (const [key, rawValue] of entries) {
    let value = rawValue;
    if (key === "email") value = normalizeEmail(value);
    if (key === "phone") value = normalizePhone(value);
    if (key === "phoneCountryCode") value = normalizeCountryCode(value);
    if (key === "status") value = normalizeStatus(value, current.status);
    if (key === "approvalStatus") value = normalizeApprovalStatus(value, current.approvalStatus);
    if (key === "webVisible" || key === "appVisible") value = normalizeVisibleFlag(value, true);
    if (key === "profileImage") value = value != null ? normalizeProfileImageField(value) : null;
    if (key === "isSuperAdmin") value = current.accountType === ADMIN ? Boolean(value) : false;

    // roleId / permissionOverrides: null/"" REMOVEs the attribute (GSI-key-safe).
    if ((key === "roleId" || key === "permissionOverrides") && (value === null || value === "")) {
      removeAttrs.push(key);
      delete merged[key];
      continue;
    }
    merged[key] = value;
  }

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    merged.phoneKey = buildPhoneKey(merged.phoneCountryCode, merged.phone) || undefined;
    if (!merged.phoneKey) delete merged.phoneKey;
  }
  if (updates.status !== undefined) {
    merged.accountTypeStatus = buildAccountTypeStatus(merged.accountType, merged.status);
  }

  const patchKeys = new Set(entries.map(([k]) => k).filter((k) => !removeAttrs.includes(k)));
  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) patchKeys.add("phoneKey");
  if (updates.status !== undefined) patchKeys.add("accountTypeStatus");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";
  for (const key of patchKeys) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    setExpr += `, #${key} = :${key}`;
  }

  let updateExpression = setExpr;
  if (removeAttrs.length > 0) {
    for (const key of removeAttrs) exprNames[`#${key}`] = key;
    updateExpression += ` REMOVE ${removeAttrs.map((k) => `#${k}`).join(", ")}`;
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

  return Attributes;
}

async function deleteStaffAccount(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
  return { deleted: true };
}

async function countStaffAccountsByRoleId(roleId) {
  if (!roleId) return 0;
  const { Count } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "RoleIdIndex",
      KeyConditionExpression: "roleId = :roleId",
      ExpressionAttributeValues: { ":roleId": roleId },
      Select: "COUNT",
    })
  );
  return Count ?? 0;
}

async function listAssistantsByWellnessCoachId(wellnessCoachId) {
  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "WellnessCoachIdIndex",
      KeyConditionExpression: "wellnessCoachId = :wellnessCoachId",
      ExpressionAttributeValues: { ":wellnessCoachId": wellnessCoachId },
      ScanIndexForward: false,
    })
  );
  return Items;
}

async function listStaffAccounts({
  accountType,
  page = 1,
  limit = 20,
  status,
  search,
  roleId,
} = {}) {
  const normalizedType = accountType ? normalizeAccountType(accountType) : null;
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "email", "phone"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...(searchFilter.exprNames || {}) };
  const exprValues = { ...(searchFilter.exprValues || {}) };

  if (roleId) {
    exprNames["#roleId"] = "roleId";
    exprValues[":roleId"] = roleId;
    filterExpression = appendFilter(filterExpression, "#roleId = :roleId");
  }

  if (normalizedType && normalizedStatus) {
    const { items, pagination } = await listByPartitionKey({
      tableName: TABLE,
      indexName: "AccountTypeStatusCreatedAtIndex",
      partitionKeyName: "accountTypeStatus",
      partitionKeyValue: buildAccountTypeStatus(normalizedType, normalizedStatus),
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
    return { accounts: items.map(toPublicStaffAccount), pagination };
  }

  if (normalizedType) {
    const { items, pagination } = await listByPartitionKey({
      tableName: TABLE,
      indexName: "AccountTypeCreatedAtIndex",
      partitionKeyName: "accountType",
      partitionKeyValue: normalizedType,
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
    return { accounts: items.map(toPublicStaffAccount), pagination };
  }

  // No accountType filter — merge across all three partitions.
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "AccountTypeCreatedAtIndex",
    partitionKeyName: "accountType",
    statusPartitions: ACCOUNT_TYPES,
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
  return { accounts: items.map(toPublicStaffAccount), pagination };
}

// ---------------------------------------------------------------------------
// Dual-write mirrors (M2). Legacy `adminModel`/`wellnessCoachModel`/
// `assistantWellnessCoachModel` remain the source of truth during the
// M2-M3 migration window; every create/update/delete on those tables also
// mirrors here so `StaffAccount` stays in sync without a backfill for
// accounts created/edited *after* this shipped. `Backend/scripts/backfillStaffAccounts.js`
// (M3) handles everything that existed *before* it shipped. Mirroring is
// best-effort: a mirror failure is logged, never thrown back at the legacy
// caller, so the migration can never break existing Admin/Coach/Assistant flows.
// ---------------------------------------------------------------------------

async function safeMirror(fn) {
  try {
    await fn();
  } catch (err) {
    console.error("[staffAccountModel] dual-write mirror failed:", err.message);
  }
}

function mirrorItemFromAdmin(admin) {
  return {
    id: admin.id,
    accountType: ADMIN,
    accountTypeStatus: buildAccountTypeStatus(ADMIN, normalizeStatus(admin.status, "active")),
    name: admin.name || "",
    email: normalizeEmail(admin.email),
    phoneCountryCode: admin.phoneCountryCode || null,
    phone: admin.phone || null,
    phoneKey: admin.phone ? buildPhoneKey(admin.phoneCountryCode || "+91", admin.phone) : undefined,
    profileImage: admin.profileImage || null,
    password: admin.password || null,
    status: normalizeStatus(admin.status, "active"),
    isSuperAdmin: Boolean(admin.isSuperAdmin),
    ...(!admin.isSuperAdmin && admin.roleId ? { roleId: admin.roleId } : {}),
    createdAt: admin.createdAt,
    updatedAt: admin.updatedAt,
  };
}

function mirrorItemFromWellnessCoach(coach) {
  return {
    id: coach.id,
    accountType: WELLNESS_COACH,
    accountTypeStatus: buildAccountTypeStatus(WELLNESS_COACH, normalizeStatus(coach.status, "active")),
    name: coach.name || "",
    email: normalizeEmail(coach.email),
    phoneCountryCode: coach.phoneCountryCode || null,
    phone: coach.phone || null,
    phoneKey: coach.phoneKey || (coach.phone ? buildPhoneKey(coach.phoneCountryCode, coach.phone) : undefined),
    profileImage: coach.profileImage || null,
    password: coach.password || null,
    status: normalizeStatus(coach.status, "active"),
    isSuperAdmin: false,
    ...(coach.roleId ? { roleId: coach.roleId } : {}),
    approvalStatus: normalizeApprovalStatus(coach.approvalStatus, "approved"),
    specializationId: coach.specializationId || null,
    bio: coach.bio || null,
    country: coach.country || null,
    state: coach.state || null,
    city: coach.city || null,
    fcmId: coach.fcmId || null,
    referralCode: coach.referralCode || null,
    webVisible: normalizeVisibleFlag(coach.webVisible, true),
    appVisible: normalizeVisibleFlag(coach.appVisible, true),
    // The still-legacy admin UI writes `permissionOverrides` with legacy
    // (`nav.*`/`clientTab.*`) keys — remap to unified slugs at the mirror
    // boundary so `resolveStaffPermissions` (used by both `protectStaff` and
    // the fixed-up `protectWellnessCoachLegacy`) can apply them directly.
    ...(coach.permissionOverrides
      ? { permissionOverrides: remapLegacyOverrides(coach.permissionOverrides, "COACH") }
      : {}),
    otp: coach.otp ?? null,
    otpExpire: coach.otpExpire ?? null,
    createdAt: coach.createdAt,
    updatedAt: coach.updatedAt,
  };
}

function mirrorItemFromAssistant(assistant) {
  return {
    id: assistant.id,
    accountType: ASSISTANT_WELLNESS_COACH,
    accountTypeStatus: buildAccountTypeStatus(
      ASSISTANT_WELLNESS_COACH,
      normalizeStatus(assistant.status, "active")
    ),
    name: assistant.name || "",
    email: normalizeEmail(assistant.email),
    phoneCountryCode: assistant.phoneCountryCode || null,
    phone: assistant.phone || null,
    phoneKey:
      assistant.phoneKey || (assistant.phone ? buildPhoneKey(assistant.phoneCountryCode, assistant.phone) : undefined),
    profileImage: assistant.profileImage || null,
    password: assistant.password || null,
    status: normalizeStatus(assistant.status, "active"),
    isSuperAdmin: false,
    wellnessCoachId: assistant.wellnessCoachId || null,
    designation: assistant.designation || null,
    fcmId: assistant.fcmId || null,
    referralCode: assistant.referralCode || null,
    webVisible: normalizeVisibleFlag(assistant.webVisible, true),
    appVisible: normalizeVisibleFlag(assistant.appVisible, true),
    otp: assistant.otp ?? null,
    otpExpire: assistant.otpExpire ?? null,
    createdAt: assistant.createdAt,
    updatedAt: assistant.updatedAt,
  };
}

function mirrorAdmin(admin) {
  if (!admin?.id) return Promise.resolve();
  return safeMirror(() => putStaffAccountRaw(mirrorItemFromAdmin(admin)));
}

function mirrorWellnessCoach(coach) {
  if (!coach?.id) return Promise.resolve();
  return safeMirror(() => putStaffAccountRaw(mirrorItemFromWellnessCoach(coach)));
}

/**
 * Legacy `AssistantWellnessCoach` rows have no `roleId` column at all — it's a
 * `StaffAccount`-only concept introduced by the unified panel (M3 default-role
 * backfill, or a role assigned live through `/staff/accounts` pre-cutover).
 * A raw mirror `Put` would otherwise wipe that `roleId` on every legacy
 * create/update, so it's carried over from whatever is already in `StaffAccount`.
 */
function mirrorAssistant(assistant) {
  if (!assistant?.id) return Promise.resolve();
  return safeMirror(async () => {
    const item = mirrorItemFromAssistant(assistant);
    if (!item.roleId) {
      const existing = await getStaffAccountRecordById(assistant.id);
      if (existing?.roleId) item.roleId = existing.roleId;
    }
    await putStaffAccountRaw(item);
  });
}

function mirrorDelete(id) {
  if (!id) return Promise.resolve();
  return safeMirror(() =>
    docClient.send(new DeleteCommand({ TableName: TABLE, Key: { id } }))
  );
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  ALLOWED_APPROVAL_STATUS,
  normalizeAccountType,
  normalizeStatus,
  normalizeApprovalStatus,
  normalizeVisibleFlag,
  buildAccountTypeStatus,
  createStaffAccount,
  putStaffAccountRaw,
  getStaffAccountRecordById,
  getStaffAccountById,
  getStaffAccountByEmail,
  getStaffAccountByPhoneKey,
  assertEmailAvailable,
  assertPhoneAvailable,
  updateStaffAccount,
  deleteStaffAccount,
  countStaffAccountsByRoleId,
  listAssistantsByWellnessCoachId,
  listStaffAccounts,
  toPublicStaffAccount,
  mirrorAdmin,
  mirrorWellnessCoach,
  mirrorAssistant,
  mirrorDelete,
};
