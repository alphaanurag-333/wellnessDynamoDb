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
const {
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
} = require("./userModel");
const { normalizeNullableMediaField, resolvePublicUrl } = require("../utils/s3");

const TABLE = "WellnessCoach";
const ALLOWED_STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicWellnessCoach(coach) {
  const row = withLegacyId(coach);
  if (!row) return null;
  if (row.profileImage) row.profileImage = resolvePublicUrl(row.profileImage);
  return row;
}

function buildCoachItem(input, { id, now } = {}) {
  const phoneCountryCode = normalizeCountryCode(input.phoneCountryCode);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  return {
    id: id || uuidv4(),
    name: String(input.name || "").trim(),
    email,
    phoneCountryCode,
    phone,
    phoneKey: buildPhoneKey(phoneCountryCode, phone),
    profileImage:
      input.profileImage != null
        ? normalizeNullableMediaField(input.profileImage, "profileImage")
        : null,
    bio: input.bio != null ? String(input.bio).trim() || null : null,
    specializationId:
      input.specializationId != null ? String(input.specializationId).trim() || null : null,
    country: input.country != null ? String(input.country).trim() || null : null,
    state: input.state != null ? String(input.state).trim() || null : null,
    city: input.city != null ? String(input.city).trim() || null : null,
    status: normalizeStatus(input.status),
    createdAt: now,
    updatedAt: now,
  };
}

function sanitizeUpdateField(key, value) {
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return normalizePhone(value);
  if (key === "phoneCountryCode") return normalizeCountryCode(value);
  if (key === "status") return normalizeStatus(value);
  if (key === "specializationId") {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  if (key === "profileImage") {
    return normalizeNullableMediaField(value, "profileImage");
  }
  if (["name", "bio", "country", "state", "city"].includes(key)) {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  return value;
}

async function getWellnessCoachByEmail(email) {
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

async function getWellnessCoachByPhone(phoneCountryCode, phone) {
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

async function createWellnessCoach(fields) {
  const now = new Date().toISOString();
  const item = buildCoachItem(fields, { now });

  if (!item.name) throw new Error("name is required");
  if (!item.email) throw new Error("email is required");
  if (!item.phone) throw new Error("phone is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return toPublicWellnessCoach(item);
}

async function getWellnessCoachRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function getWellnessCoachById(id) {
  const item = await getWellnessCoachRecordById(id);
  return item ? toPublicWellnessCoach(item) : null;
}

async function updateWellnessCoach(id, updates) {
  const blocked = new Set(["id", "_id", "createdAt", "phoneKey"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blocked.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const current = await getWellnessCoachRecordById(id);
  if (!current) {
    const err = new Error("Wellness coach not found");
    err.name = "NotFoundError";
    throw err;
  }

  const merged = { ...current };
  for (const [k, v] of entries) merged[k] = v;

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    merged.phoneKey = buildPhoneKey(merged.phoneCountryCode, merged.phone);
  }

  const patchKeys = entries.map(([k]) => k);
  if (patchKeys.includes("phone") || patchKeys.includes("phoneCountryCode")) {
    patchKeys.push("phoneKey");
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

  return toPublicWellnessCoach(Attributes || null);
}

async function deleteWellnessCoach(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listWellnessCoaches({ page = 1, limit = 20, status, search } = {}) {
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
      "(contains(#name, :search) OR contains(#email, :search) OR contains(#phone, :search) OR contains(#specializationId, :search))"
    );
    names["#name"] = "name";
    names["#email"] = "email";
    names["#phone"] = "phone";
    names["#specializationId"] = "specializationId";
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
  const wellnessCoaches = rows
    .slice(start, start + safeLimit)
    .map((row) => toPublicWellnessCoach(row));

  return {
    wellnessCoaches,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  normalizeStatus,
  buildCoachItem,
  createWellnessCoach,
  getWellnessCoachById,
  getWellnessCoachRecordById,
  getWellnessCoachByEmail,
  getWellnessCoachByPhone,
  updateWellnessCoach,
  deleteWellnessCoach,
  listWellnessCoaches,
};
