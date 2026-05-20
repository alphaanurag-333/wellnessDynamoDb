const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");

const YOGA_MEDIA_FIELDS = ["thumbnail", "video"];

const TABLE = "Yoga";
const YOGA_ALLOWED_STATUS = ["active", "inactive"];
const YOGA_ALLOWED_TYPE = ["ytlink", "video"];
const STATUS = new Set(YOGA_ALLOWED_STATUS);
const TYPE = new Set(YOGA_ALLOWED_TYPE);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "ytlink") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPE.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicYoga(item) {
  const row = withLegacyId(item);
  return row ? resolveMediaFields(row, YOGA_MEDIA_FIELDS) : null;
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "type") return normalizeType(value);
  if (key === "thumbnail" || key === "video") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, key);
  }
  if (["title", "description", "ytLink"].includes(key)) {
    return String(value || "").trim();
  }
  return value;
}

async function createYoga({
  title,
  description,
  thumbnail,
  type = "ytlink",
  ytLink = "",
  video = "",
  status = "active",
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    thumbnail: normalizeMediaField(thumbnail, "thumbnail"),
    type: normalizeType(type),
    ytLink: String(ytLink || "").trim(),
    video: video ? normalizeMediaField(video, "video") : "",
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return toPublicYoga(item);
}

async function getYogaRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getYogaById(id) {
  const item = await getYogaRecordById(id);
  return item ? toPublicYoga(item) : null;
}

async function updateYoga(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
  }

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
  }));
  return toPublicYoga(Attributes || null);
}

async function deleteYoga(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listYoga({ page = 1, limit = 10, status, type, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedType = type ? String(type).toLowerCase().trim() : "";
  const normalizedSearch = String(search || "").trim().toLowerCase();

  const filters = [];
  const names = {};
  const values = {};

  if (normalizedStatus) {
    filters.push("#status = :status");
    names["#status"] = "status";
    values[":status"] = normalizedStatus;
  }
  if (normalizedType && TYPE.has(normalizedType)) {
    filters.push("#type = :type");
    names["#type"] = "type";
    values[":type"] = normalizedType;
  }
  if (normalizedSearch) {
    filters.push("(contains(#title, :search) OR contains(#description, :search))");
    names["#title"] = "title";
    names["#description"] = "description";
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
    const { Items, LastEvaluatedKey } = await docClient.send(new ScanCommand({
      ...params,
      ExclusiveStartKey: lastKey,
    }));
    if (Array.isArray(Items) && Items.length) rows.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const yoga = rows.slice(start, start + safeLimit).map((row) => toPublicYoga(row));

  return {
    yoga,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

module.exports = {
  YOGA_ALLOWED_STATUS,
  YOGA_ALLOWED_TYPE,
  normalizeStatus,
  normalizeType,
  createYoga,
  getYogaById,
  getYogaRecordById,
  updateYoga,
  deleteYoga,
  listYoga,
};
