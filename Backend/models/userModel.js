const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { toPublicProfile } = require("../utils/toPublicProfile");

const TABLE = "User";

const USER_ALLOWED_STATUS = ["active", "inactive", "blocked"];
const USER_ALLOWED_GENDERS = ["male", "female", "other", "boy", "girl", "guess"];

const STATUS = new Set(USER_ALLOWED_STATUS);
const GENDERS = new Set(USER_ALLOWED_GENDERS);

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

function toPublicUser(user) {
  const pub = toPublicProfile(user);
  if (!pub) return null;
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
  if (
    [
      "name",
      "passwordHash",
      "whatsappPhone",
      "country",
      "state",
      "city",
      "primaryHealthConcern",
      "profileImage",
      "fcm_id",
      "otp",
      "resetPasswordToken",
    ].includes(key)
  ) {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  return value;
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
    profileImage: input.profileImage != null ? String(input.profileImage).trim() || null : null,
    fcm_id: input.fcm_id != null ? String(input.fcm_id).trim() || null : null,
    status: normalizeStatus(input.status),
    otp: input.otp != null ? String(input.otp) : null,
    otpExpire: input.otpExpire ? normalizeDob(input.otpExpire) : null,
    resetPasswordToken: input.resetPasswordToken != null ? String(input.resetPasswordToken) : null,
    resetPasswordExpire: input.resetPasswordExpire ? normalizeDob(input.resetPasswordExpire) : null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createUser(fields) {
  const now = new Date().toISOString();
  const item = buildUserItem(fields, { now });

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
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  const current = await getUserById(id);
  if (!current) {
    const err = new Error("User not found");
    err.name = "NotFoundError";
    throw err;
  }

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
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const key of uniquePatch) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    setExpr += `, #${key} = :${key}`;
  }

  if (uniquePatch.length === 0) {
    throw new Error("No valid fields provided for update");
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

async function listUsers({ page = 1, limit = 20, status, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedSearch = String(search || "").trim().toLowerCase();

  const filters = [];
  const names = {};
  const values = {};

  if (normalizedStatus) {
    filters.push("#status = :status");
    names["#status"] = "status";
    values[":status"] = normalizedStatus;
  }
  if (normalizedSearch) {
    filters.push(
      "(contains(#name, :search) OR contains(#email, :search) OR contains(#phone, :search))"
    );
    names["#name"] = "name";
    names["#email"] = "email";
    names["#phone"] = "phone";
    values[":search"] = normalizedSearch;
  }

  const params = { TableName: TABLE };
  if (filters.length > 0) {
    params.FilterExpression = filters.join(" AND ");
    params.ExpressionAttributeNames = names;
    params.ExpressionAttributeValues = values;
  }

  const rows = [];
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      })
    );
    if (Array.isArray(Items) && Items.length) rows.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const users = rows.slice(start, start + safeLimit).map(withLegacyId);

  return {
    users,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

module.exports = {
  TABLE,
  USER_ALLOWED_STATUS,
  USER_ALLOWED_GENDERS,
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
  normalizeStatus,
  normalizeGender,
  normalizeDob,
  buildUserItem,
  toPublicUser,
  createUser,
  getUserById,
  getUserByEmail,
  getUserByPhone,
  updateUser,
  deleteUser,
  listUsers,
};
