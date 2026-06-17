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
const { getWellnessCoachById } = require("./wellnessCoachModel");
const { getSpecializationById } = require("./specializationModel");
const {
  normalizeStoredMedia,
  resolvePublicUrl,
} = require("../utils/s3");
const { toPublicProfile } = require("../utils/toPublicProfile");

const TABLE = "AssistantWellnessCoach";
const ALLOWED_STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return null;
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. assistant-wellness-coach/photo.jpg)");
  }
  return objectKey;
}

function toPublicAssistant(assistant) {
  if (!assistant) return assistant;
  const pub = toPublicProfile(withLegacyId(assistant));
  if (pub.profileImage) {
    pub.profileImage = resolvePublicUrl(pub.profileImage);
  }
  return pub;
}

function buildAssistantItem(input, { id, now } = {}) {
  const phoneCountryCode = normalizeCountryCode(input.phoneCountryCode);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  return {
    id: id || uuidv4(),
    wellnessCoachId: String(input.wellnessCoachId || "").trim(),
    name: String(input.name || "").trim(),
    email,
    phoneCountryCode,
    phone,
    phoneKey: buildPhoneKey(phoneCountryCode, phone),
    profileImage: normalizeProfileImageField(input.profileImage),
    designation: input.designation != null ? String(input.designation).trim() || null : null,
    password: input.password != null ? String(input.password) : null,
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
  if (key === "profileImage") {
    return normalizeProfileImageField(value);
  }
  if (["name", "designation"].includes(key)) {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  if (key === "password") {
    return value != null ? String(value) : null;
  }
  return value;
}

async function getAssistantByEmail(email) {
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

async function getAssistantByPhone(phoneCountryCode, phone) {
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

async function specializationTitleForCoach(coach, titleCache) {
  if (!coach?.specializationId) return null;
  const sid = coach.specializationId;
  if (titleCache.has(sid)) return titleCache.get(sid);
  const spec = await getSpecializationById(sid);
  const title = spec?.title ?? null;
  titleCache.set(sid, title);
  return title;
}

function slimWellnessCoach(coach, specializationTitle = null) {
  if (!coach) return null;
  return {
    id: coach.id,
    _id: coach._id ?? coach.id,
    name: coach.name,
    email: coach.email,
    phone: coach.phone,
    phoneCountryCode: coach.phoneCountryCode,
    status: coach.status,
    profileImage: coach.profileImage ? resolvePublicUrl(coach.profileImage) : null,
    specializationId: coach.specializationId ?? null,
    specializationTitle,
  };
}

async function populateWellnessCoach(assistant, wellnessCoach = undefined) {
  if (!assistant) return assistant;

  const pub = toPublicAssistant(withLegacyId(assistant));
  const coachId = String(pub.wellnessCoachId || "").trim();
  if (!coachId) {
    return { ...pub, wellnessCoach: null, wellnessCoachName: null };
  }

  let coach = wellnessCoach;
  if (coach === undefined) {
    coach = await getWellnessCoachById(coachId);
  }

  const titleCache = new Map();
  const specializationTitle = await specializationTitleForCoach(coach, titleCache);
  const slim = slimWellnessCoach(coach, specializationTitle);

  return {
    ...pub,
    wellnessCoach: slim,
    wellnessCoachName: slim?.name ?? null,
  };
}

async function populateWellnessCoaches(assistants) {
  if (!Array.isArray(assistants) || assistants.length === 0) return assistants;

  const coachCache = new Map();
  const titleCache = new Map();
  const result = [];

  for (const assistant of assistants) {
    const pub = toPublicAssistant(withLegacyId(assistant));
    const coachId = String(pub?.wellnessCoachId || "").trim();
    if (!coachId) {
      result.push({ ...pub, wellnessCoach: null, wellnessCoachName: null });
      continue;
    }

    if (!coachCache.has(coachId)) {
      const coach = await getWellnessCoachById(coachId);
      const specializationTitle = await specializationTitleForCoach(coach, titleCache);
      coachCache.set(coachId, slimWellnessCoach(coach, specializationTitle));
    }

    const slim = coachCache.get(coachId);
    result.push({
      ...pub,
      wellnessCoach: slim,
      wellnessCoachName: slim?.name ?? null,
    });
  }

  return result;
}

async function countAssistantsByWellnessCoachId(wellnessCoachId) {
  const { Count } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "WellnessCoachIndex",
      KeyConditionExpression: "wellnessCoachId = :wellnessCoachId",
      ExpressionAttributeValues: { ":wellnessCoachId": wellnessCoachId },
      Select: "COUNT",
    })
  );
  return Count ?? 0;
}

async function createAssistantWellnessCoach(fields) {
  const now = new Date().toISOString();
  const item = buildAssistantItem(fields, { now });

  if (!item.wellnessCoachId) throw new Error("wellnessCoachId is required");
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

  return withLegacyId(item);
}

async function getAssistantWellnessCoachById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function updateAssistantWellnessCoach(id, updates) {
  const blocked = new Set(["id", "_id", "createdAt", "phoneKey", "wellnessCoachId"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blocked.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const current = await getAssistantWellnessCoachById(id);
  if (!current) {
    const err = new Error("Assistant wellness coach not found");
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

  return withLegacyId(Attributes || null);
}

async function deleteAssistantWellnessCoach(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listAssistantsByWellnessCoachId(
  wellnessCoachId,
  { page = 1, limit = 20, status, search } = {}
) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedSearch = String(search || "").trim().toLowerCase();

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "WellnessCoachIndex",
      KeyConditionExpression: "wellnessCoachId = :wellnessCoachId",
      ExpressionAttributeValues: { ":wellnessCoachId": wellnessCoachId },
      ScanIndexForward: false,
    })
  );

  let rows = Items.map(withLegacyId);

  if (normalizedStatus) {
    rows = rows.filter((r) => r.status === normalizedStatus);
  }
  if (normalizedSearch) {
    rows = rows.filter(
      (r) =>
        String(r.name || "").toLowerCase().includes(normalizedSearch) ||
        String(r.email || "").toLowerCase().includes(normalizedSearch) ||
        String(r.phone || "").includes(normalizedSearch) ||
        String(r.designation || "").toLowerCase().includes(normalizedSearch)
    );
  }

  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const assistants = rows.slice(start, start + safeLimit);

  return {
    assistants,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

async function listAssistantWellnessCoaches({ page = 1, limit = 20, status, search, wellnessCoachId } = {}) {
  if (wellnessCoachId) {
    return listAssistantsByWellnessCoachId(wellnessCoachId, { page, limit, status, search });
  }

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
      "(contains(#name, :search) OR contains(#email, :search) OR contains(#phone, :search) OR contains(#designation, :search))"
    );
    names["#name"] = "name";
    names["#email"] = "email";
    names["#phone"] = "phone";
    names["#designation"] = "designation";
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
  const assistants = rows.slice(start, start + safeLimit).map(withLegacyId);

  return {
    assistants,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  normalizeStatus,
  buildAssistantItem,
  createAssistantWellnessCoach,
  getAssistantWellnessCoachById,
  getAssistantByEmail,
  getAssistantByPhone,
  updateAssistantWellnessCoach,
  deleteAssistantWellnessCoach,
  listAssistantsByWellnessCoachId,
  listAssistantWellnessCoaches,
  countAssistantsByWellnessCoachId,
  slimWellnessCoach,
  populateWellnessCoach,
  populateWellnessCoaches,
  toPublicAssistant,
};
