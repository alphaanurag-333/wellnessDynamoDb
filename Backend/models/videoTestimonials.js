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

const VIDEO_TESTIMONIAL_MEDIA = ["profile_image", "video"];

const TABLE = "VideoTestimonials";
const TYPE = new Set(["link", "video"]);
const STATUS = new Set(["active", "inactive"]);
function normalizeType(value, fallback = "link") {
  const next = String(value || fallback).toLowerCase().trim();

  return TYPE.has(next) ? next : fallback;
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicVideoTestimonial(item) {
  const row = withLegacyId(item);
  return row ? resolveMediaFields(row, VIDEO_TESTIMONIAL_MEDIA) : null;
}

function sanitizeUpdateField(key, value) {
  if (key === "type") return normalizeType(value);
  if (key === "status") return normalizeStatus(value);
  if (key === "profile_image" || key === "video") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, key);
  }
  if (["name", "ytLink"].includes(key)) return String(value).trim();
  return value;
}

async function createVideoTestimonial({ name, profile_image, ytLink, video, type = "link", status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    profile_image: normalizeMediaField(profile_image, "profile_image"),
    ytLink: String(ytLink || "").trim(),
    video: video ? normalizeMediaField(video, "video") : "",
    type: normalizeType(type),
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return toPublicVideoTestimonial(item);
}

async function getVideoTestimonialRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getVideoTestimonialById(id) {
  const item = await getVideoTestimonialRecordById(id);
  return item ? toPublicVideoTestimonial(item) : null;
}

async function updateVideoTestimonial(id, updates) {
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
  return toPublicVideoTestimonial(Attributes || null);
}

async function deleteVideoTestimonial(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listVideoTestimonials({ page = 1, limit = 10, type, status, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));
  const normalizedType = type ? normalizeType(type, "") : "";
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedSearch = String(search || "").trim().toLowerCase();

  const filters = [];
  const names = {};
  const values = {};

  if (normalizedType) {
    filters.push("#type = :type");
    names["#type"] = "type";
    values[":type"] = normalizedType;
  }
  if (normalizedStatus) {
    filters.push("#status = :status");
    names["#status"] = "status";
    values[":status"] = normalizedStatus;
  }
  if (normalizedSearch) {
    filters.push("contains(#name, :search)");
    names["#name"] = "name";
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
  const videoTestimonials = rows
    .slice(start, start + safeLimit)
    .map((row) => toPublicVideoTestimonial(row));

  return {
    videoTestimonials,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

module.exports = {
  normalizeType,
  normalizeStatus,
  createVideoTestimonial,
  getVideoTestimonialById,
  getVideoTestimonialRecordById,
  updateVideoTestimonial,
  deleteVideoTestimonial,
  listVideoTestimonials,
};
