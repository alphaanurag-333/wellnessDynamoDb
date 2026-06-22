const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { toPublicProfile } = require("../utils/toPublicProfile");
const {
  normalizeStoredMedia,
  resolvePublicUrl,
} = require("../utils/s3");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "User";

/** GSI partition keys must be omitted when unset — DynamoDB rejects NULL index keys. */
const SPARSE_GSI_ATTRIBUTES = new Set(["parentCoachId"]);

const USER_ALLOWED_STATUS = ["active", "inactive", "blocked"];
const USER_ALLOWED_GENDERS = ["male", "female", "other", "boy", "girl", "guess"];
const USER_ALLOWED_TIERS = ["seek", "consultancy_only", "heal"];
const USER_ALLOWED_ASSIGNMENT_STATUSES = ["assigned", "pending_admin"];
const USER_ALLOWED_ASSIGNED_COACH_TYPES = ["wellness_coach", "assistant_wellness_coach"];
const USER_ALLOWED_ASSIGNMENT_SOURCES = ["referral", "admin_manual", "coach_reassign"];

const STATUS = new Set(USER_ALLOWED_STATUS);
const GENDERS = new Set(USER_ALLOWED_GENDERS);
const TIERS = new Set(USER_ALLOWED_TIERS);
const ASSIGNMENT_STATUSES = new Set(USER_ALLOWED_ASSIGNMENT_STATUSES);
const ASSIGNED_COACH_TYPES = new Set(USER_ALLOWED_ASSIGNED_COACH_TYPES);
const ASSIGNMENT_SOURCES = new Set(USER_ALLOWED_ASSIGNMENT_SOURCES);

function normalizeEmail(email) {
  return String(email || "").toLowerCase().trim();
}

function normalizePhone(phone) {
  return String(phone || "").trim();
}

function normalizeCountryCode(code, fallback = "+91") {
  const raw = String(code ?? fallback).trim();
  if (!raw) return fallback;
  return raw.startsWith("+") ? raw : `+${raw}`;
}

/** Stable GSI key for unique phone lookups (country code + number). */
function buildPhoneKey(phoneCountryCode, phone) {
  const cc = normalizeCountryCode(phoneCountryCode);
  const num = normalizePhone(phone);
  if (!num) return "";
  return `${cc}#${num}`;
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeGender(value, fallback = "boy") {
  const next = String(value || fallback).toLowerCase().trim();
  return GENDERS.has(next) ? next : fallback;
}

function normalizeUserTier(value, fallback = "seek") {
  const next = String(value || fallback).toLowerCase().trim();
  return TIERS.has(next) ? next : fallback;
}

function normalizeAssignmentStatus(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNMENT_STATUSES.has(next) ? next : null;
}

function normalizeAssignedCoachType(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNED_COACH_TYPES.has(next) ? next : null;
}

function normalizeAssignmentSource(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ASSIGNMENT_SOURCES.has(next) ? next : null;
}

function normalizeReferralCodeField(value) {
  if (value == null || value === "") return null;
  return String(value).trim().toUpperCase() || null;
}

function normalizeDob(value) {
  if (value === undefined || value === null || value === "") return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. user/photo.jpg)");
  }
  return objectKey;
}

function toPublicUser(user) {
  const pub = toPublicProfile(user);
  if (!pub) return null;
  if (pub.profileImage) {
    pub.profileImage = resolvePublicUrl(pub.profileImage);
  }
  return withLegacyId(pub);
}

function sanitizeUpdateField(key, value) {
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return normalizePhone(value);
  if (key === "phoneCountryCode" || key === "whatsappCountryCode") {
    return normalizeCountryCode(value);
  }
  if (key === "status") return normalizeStatus(value);
  if (key === "gender") return normalizeGender(value);
  if (key === "dob") return normalizeDob(value);
  if (key === "termsAcceptedAt") return normalizeDob(value);
  if (key === "otpExpire" || key === "resetPasswordExpire") {
    return value ? normalizeDob(value) : null;
  }
  if (key === "whatsappSameAsMobile" || key === "termsAccepted") {
    return Boolean(value);
  }
  if (key === "profileImage") {
    return normalizeProfileImageField(value);
  }
  if (key === "userTier") return normalizeUserTier(value);
  if (key === "assignmentStatus") return normalizeAssignmentStatus(value);
  if (key === "assignedCoachType") return normalizeAssignedCoachType(value);
  if (key === "assignmentSource") return normalizeAssignmentSource(value);
  if (key === "referralCode" || key === "referredByCode") return normalizeReferralCodeField(value);
  if (key === "convertedAt" || key === "assignedAt" || key === "consultancyPaidAt") return normalizeDob(value);
  if (
    [
      "name",
      "passwordHash",
      "whatsappPhone",
      "country",
      "state",
      "city",
      "primaryHealthConcern",
      "fcm_id",
      "otp",
      "resetPasswordToken",
      "assignedCoachId",
      "parentCoachId",
      "referredByUserId",
      "referredByEntityType",
      "referredByEntityId",
    ].includes(key)
  ) {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  return value;
}

function omitSparseGsiAttributes(item) {
  const next = { ...item };
  for (const key of SPARSE_GSI_ATTRIBUTES) {
    if (next[key] == null || next[key] === "") {
      delete next[key];
    }
  }
  return next;
}

function buildUserItem(input, { id, now } = {}) {
  const phoneCountryCode = normalizeCountryCode(input.phoneCountryCode);
  const phone = normalizePhone(input.phone);
  const whatsappSameAsMobile = Boolean(input.whatsappSameAsMobile);
  const whatsappCountryCode = whatsappSameAsMobile
    ? phoneCountryCode
    : normalizeCountryCode(input.whatsappCountryCode);
  const whatsappPhone = whatsappSameAsMobile
    ? phone
    : input.whatsappPhone != null
      ? normalizePhone(input.whatsappPhone) || null
      : null;

  const email = normalizeEmail(input.email);
  const phoneKey = buildPhoneKey(phoneCountryCode, phone);

  return {
    id: id || uuidv4(),
    name: String(input.name || "").trim(),
    email,
    passwordHash: input.passwordHash != null ? String(input.passwordHash) : null,
    phoneCountryCode,
    phone,
    phoneKey,
    whatsappSameAsMobile,
    whatsappCountryCode,
    whatsappPhone,
    dob: normalizeDob(input.dob),
    gender: normalizeGender(input.gender),
    country: input.country != null ? String(input.country).trim() || null : null,
    state: input.state != null ? String(input.state).trim() || null : null,
    city: input.city != null ? String(input.city).trim() || null : null,
    primaryHealthConcern:
      input.primaryHealthConcern != null ? String(input.primaryHealthConcern).trim() || null : null,
    termsAccepted: Boolean(input.termsAccepted),
    termsAcceptedAt: input.termsAcceptedAt ? normalizeDob(input.termsAcceptedAt) : null,
    profileImage: normalizeProfileImageField(input.profileImage),
    fcm_id: input.fcm_id != null ? String(input.fcm_id).trim() || null : null,
    status: normalizeStatus(input.status),
    otp: input.otp != null ? String(input.otp) : null,
    otpExpire: input.otpExpire ? normalizeDob(input.otpExpire) : null,
    resetPasswordToken: input.resetPasswordToken != null ? String(input.resetPasswordToken) : null,
    resetPasswordExpire: input.resetPasswordExpire ? normalizeDob(input.resetPasswordExpire) : null,
    userTier: normalizeUserTier(input.userTier),
    referralCode: normalizeReferralCodeField(input.referralCode),
    referredByUserId: input.referredByUserId != null ? String(input.referredByUserId).trim() || null : null,
    referredByCode: normalizeReferralCodeField(input.referredByCode),
    referredByEntityType:
      input.referredByEntityType != null ? String(input.referredByEntityType).trim() || null : null,
    referredByEntityId:
      input.referredByEntityId != null ? String(input.referredByEntityId).trim() || null : null,
    assignedCoachId: input.assignedCoachId != null ? String(input.assignedCoachId).trim() || null : null,
    assignedCoachType: normalizeAssignedCoachType(input.assignedCoachType),
    parentCoachId: input.parentCoachId != null ? String(input.parentCoachId).trim() || null : null,
    assignmentStatus: normalizeAssignmentStatus(input.assignmentStatus),
    assignmentSource: normalizeAssignmentSource(input.assignmentSource),
    assignedAt: input.assignedAt ? normalizeDob(input.assignedAt) : null,
    consultancyPaidAt: input.consultancyPaidAt ? normalizeDob(input.consultancyPaidAt) : null,
    convertedAt: input.convertedAt ? normalizeDob(input.convertedAt) : null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createUser(fields) {
  const now = new Date().toISOString();
  const item = omitSparseGsiAttributes(buildUserItem(fields, { now }));

  if (!item.name) throw new Error("name is required");
  if (!item.email) throw new Error("email is required");
  if (!item.phone) throw new Error("phone is required");
  if (!item.phoneKey) throw new Error("phoneKey is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return withLegacyId(item);
}

async function getUserById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function getUserByEmail(email) {
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
  return withLegacyId(Items?.[0] || null);
}

async function getUserByPhone(phoneCountryCode, phone) {
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
  return withLegacyId(Items?.[0] || null);
}

async function updateUser(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "phoneKey"]);
  const immutableOnceFields = new Set([
    "referredByUserId",
    "referredByCode",
    "referredByEntityType",
    "referredByEntityId",
    "convertedAt",
  ]);

  const current = await getUserById(id);
  if (!current) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

  for (const key of immutableOnceFields) {
    if (updates?.[key] !== undefined && current[key] != null && String(current[key]).trim() !== "") {
      const err = new Error(`${key} is immutable referral history`);
      err.name = "ImmutableFieldError";
      throw err;
    }
  }

  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  const merged = { ...current };
  for (const [k, v] of entries) {
    merged[k] = v;
  }

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    merged.phoneKey = buildPhoneKey(merged.phoneCountryCode, merged.phone);
  }

  if (updates.whatsappSameAsMobile === true || updates.whatsappSameAsMobile === false) {
    if (merged.whatsappSameAsMobile) {
      merged.whatsappCountryCode = merged.phoneCountryCode;
      merged.whatsappPhone = merged.phone;
    }
  }

  const patchKeys = entries.map(([k]) => k);
  if (patchKeys.includes("phone") || patchKeys.includes("phoneCountryCode")) {
    patchKeys.push("phoneKey");
  }
  if (patchKeys.includes("whatsappSameAsMobile")) {
    patchKeys.push("whatsappCountryCode", "whatsappPhone");
  }

  const uniquePatch = [...new Set(patchKeys)];
  const removeKeys = uniquePatch.filter(
    (key) => SPARSE_GSI_ATTRIBUTES.has(key) && (merged[key] == null || merged[key] === "")
  );
  const setKeys = uniquePatch.filter((key) => !removeKeys.includes(key));

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let updateExpr = "SET updatedAt = :updatedAt";

  for (const key of setKeys) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    updateExpr += `, #${key} = :${key}`;
  }

  if (removeKeys.length) {
    for (const key of removeKeys) {
      exprNames[`#${key}`] = key;
    }
    updateExpr += ` REMOVE ${removeKeys.map((key) => `#${key}`).join(", ")}`;
  }

  if (setKeys.length === 0 && removeKeys.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return withLegacyId(Attributes || null);
}

async function deleteUser(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listUsersByParentCoachId(
  parentCoachId,
  { page = 1, limit = 20, search, userTier = "client", scope = "all" } = {}
) {
  const coachId = String(parentCoachId || "").trim();
  if (!coachId) {
    return { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTier = String(userTier || "client").toLowerCase().trim();
  const normalizedScope = String(scope || "all").toLowerCase().trim();

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "ParentCoachIndex",
      KeyConditionExpression: "parentCoachId = :parentCoachId",
      ExpressionAttributeValues: { ":parentCoachId": coachId },
      ScanIndexForward: false,
    })
  );

  let rows = Items.map(withLegacyId).filter((row) => {
    const tier = normalizeUserTier(row.userTier);
    if (normalizedTier === "client") return tier === "heal" || tier === "consultancy_only";
    if (normalizedTier === "all") return true;
    return tier === normalizeUserTier(normalizedTier, "");
  });

  if (normalizedScope === "direct") {
    rows = rows.filter(
      (row) =>
        normalizeAssignedCoachType(row.assignedCoachType) === "wellness_coach" &&
        String(row.assignedCoachId || "") === coachId
    );
  } else if (normalizedScope === "assistant") {
    rows = rows.filter(
      (row) => normalizeAssignedCoachType(row.assignedCoachType) === "assistant_wellness_coach"
    );
  }

  if (normalizedSearch) {
    rows = rows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(normalizedSearch) ||
        String(r.email || "").toLowerCase().includes(normalizedSearch) ||
        String(r.phone || "").includes(normalizedSearch)
    );
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;

  return {
    users: rows.slice(start, start + safeLimit),
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

async function listUsersByAssignedCoachId(
  assignedCoachId,
  { parentCoachId, page = 1, limit = 20, search, userTier = "client" } = {}
) {
  const assigneeId = String(assignedCoachId || "").trim();
  const ownerCoachId = String(parentCoachId || "").trim();
  if (!assigneeId || !ownerCoachId) {
    return { users: [], pagination: { page: 1, limit: 20, total: 0, pages: 1 } };
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedSearch = String(search || "").trim().toLowerCase();
  const normalizedTier = String(userTier || "client").toLowerCase().trim();

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "ParentCoachIndex",
      KeyConditionExpression: "parentCoachId = :parentCoachId",
      ExpressionAttributeValues: { ":parentCoachId": ownerCoachId },
      ScanIndexForward: false,
    })
  );

  let rows = Items.map(withLegacyId).filter((row) => {
    const tier = normalizeUserTier(row.userTier);
    if (String(row.assignedCoachId || "") !== assigneeId) return false;
    if (normalizeAssignedCoachType(row.assignedCoachType) !== "assistant_wellness_coach") return false;
    if (normalizedTier === "client") return tier === "heal" || tier === "consultancy_only";
    if (normalizedTier === "all") return true;
    return tier === normalizeUserTier(normalizedTier, "");
  });

  if (normalizedSearch) {
    rows = rows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(normalizedSearch) ||
        String(r.email || "").toLowerCase().includes(normalizedSearch) ||
        String(r.phone || "").includes(normalizedSearch)
    );
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;

  return {
    users: rows.slice(start, start + safeLimit),
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

async function listPendingAssignmentUsers({ page = 1, limit = 20, search, userTier } = {}) {
  return listUsers({
    page,
    limit,
    search,
    status: "active",
    userTier: userTier || "consultancy_only",
    assignmentStatus: "pending_admin",
  });
}

async function listUsers({ page = 1, limit = 20, status, search, userTier, assignmentStatus } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedTier = userTier ? normalizeUserTier(userTier, "") : "";
  const normalizedAssignment = assignmentStatus ? normalizeAssignmentStatus(assignmentStatus) : "";
  const searchFilter = buildContainsFilter(["name", "email", "phone"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    statusPartitions: ["active", "inactive", "blocked"],
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  let users = items.map(withLegacyId);

  if (normalizedTier) {
    users = users.filter((row) => normalizeUserTier(row.userTier) === normalizedTier);
  }
  if (normalizedAssignment) {
    users = users.filter((row) => normalizeAssignmentStatus(row.assignmentStatus) === normalizedAssignment);
  }

  return {
    users,
    pagination: normalizedTier || normalizedAssignment
      ? {
          ...pagination,
          total: users.length,
          pages: Math.max(1, Math.ceil(users.length / Math.min(200, Math.max(1, Number(limit) || 20)))),
        }
      : pagination,
  };
}

module.exports = {
  TABLE,
  USER_ALLOWED_STATUS,
  USER_ALLOWED_GENDERS,
  USER_ALLOWED_TIERS,
  USER_ALLOWED_ASSIGNMENT_STATUSES,
  USER_ALLOWED_ASSIGNED_COACH_TYPES,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
  normalizeStatus,
  normalizeGender,
  normalizeUserTier,
  normalizeAssignmentStatus,
  normalizeAssignedCoachType,
  normalizeDob,
  buildUserItem,
  toPublicUser,
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  deleteUser,
  listUsersByParentCoachId,
  listUsersByAssignedCoachId,
  listPendingAssignmentUsers,
  listUsers,
};
