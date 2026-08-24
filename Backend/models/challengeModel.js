const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");
const {
  PAID_ONBOARDING_STATUS_KEYS,
} = require("../utils/paidOnboardingHelpers");

const TABLE = "Challenge";
const ALLOWED_STATUS = new Set(["draft", "published", "completed", "cancelled"]);
const CANONICAL_STEP_KEYS = new Set(PAID_ONBOARDING_STATUS_KEYS);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeStatus(value, fallback = "draft") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeTitle(value) {
  const title = String(value || "").trim();
  if (!title) {
    const err = new Error("title is required");
    err.name = "ValidationError";
    throw err;
  }
  if (title.length > 200) {
    const err = new Error("title cannot exceed 200 characters");
    err.name = "ValidationError";
    throw err;
  }
  return title;
}

function normalizeDescription(value) {
  if (value === undefined || value === null) return "";
  const description = String(value).trim();
  if (description.length > 10000) {
    const err = new Error("description cannot exceed 10000 characters");
    err.name = "ValidationError";
    throw err;
  }
  return description;
}

function normalizePrice(value) {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) {
    const err = new Error("price must be a positive number");
    err.name = "ValidationError";
    throw err;
  }
  return Math.round((price + Number.EPSILON) * 100) / 100;
}

function normalizeDateOnly(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error(`${fieldName} is required`);
    err.name = "ValidationError";
    throw err;
  }
  const datePart = raw.includes("T") ? raw.slice(0, 10) : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    const err = new Error(`${fieldName} must be YYYY-MM-DD`);
    err.name = "ValidationError";
    throw err;
  }
  return datePart;
}

function normalizeImages(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => String(entry || "").trim())
    .filter(Boolean)
    .slice(0, 10);
}

function normalizeOnboardingStepKeys(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const raw of value) {
    const key = String(raw || "").trim();
    if (!CANONICAL_STEP_KEYS.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function normalizeMaxGroupSize(value, fallback = 20) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(100, Math.floor(n));
}

function toChallengePublic(item, { resolveImages = true } = {}) {
  const row = withLegacyId(item);
  if (!row) return null;
  const images = normalizeImages(row.images);
  return {
    id: row.id,
    _id: row._id,
    title: row.title,
    description: row.description || "",
    price: Number(row.price) || 0,
    currency: String(row.currency || "INR").toUpperCase(),
    images: resolveImages ? images.map((key) => resolvePublicUrl(key) || key) : images,
    imageKeys: images,
    startDate: row.startDate,
    endDate: row.endDate,
    status: normalizeStatus(row.status),
    onboardingStepKeys: normalizeOnboardingStepKeys(row.onboardingStepKeys),
    whatsappMessageTemplate: row.whatsappMessageTemplate || "",
    maxGroupSize: normalizeMaxGroupSize(row.maxGroupSize),
    enrollmentCount: Number(row.enrollmentCount) || 0,
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createChallenge({
  title,
  description = "",
  price,
  currency = "INR",
  images = [],
  startDate,
  endDate,
  status = "draft",
  onboardingStepKeys = [],
  whatsappMessageTemplate = "",
  maxGroupSize = 20,
  createdBy,
}) {
  const start = normalizeDateOnly(startDate, "startDate");
  const end = normalizeDateOnly(endDate, "endDate");
  if (end < start) {
    const err = new Error("endDate must be on or after startDate");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: normalizeTitle(title),
    description: normalizeDescription(description),
    price: normalizePrice(price),
    currency: String(currency || "INR").toUpperCase(),
    images: normalizeImages(images),
    startDate: start,
    endDate: end,
    status: normalizeStatus(status),
    onboardingStepKeys: normalizeOnboardingStepKeys(onboardingStepKeys),
    whatsappMessageTemplate: String(whatsappMessageTemplate || "").trim(),
    maxGroupSize: normalizeMaxGroupSize(maxGroupSize),
    enrollmentCount: 0,
    createdBy: String(createdBy || "").trim() || null,
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

  return toChallengePublic(item);
}

async function getChallengeRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getChallengeById(id, options) {
  const item = await getChallengeRecordById(id);
  return item ? toChallengePublic(item, options) : null;
}

async function listChallenges({ page = 1, limit = 20, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["title", "description"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    statusPartitions: Array.from(ALLOWED_STATUS),
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    challenges: items.map((row) => toChallengePublic(row)),
    pagination,
  };
}

async function listPublishedChallenges({ page = 1, limit = 50 } = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "published",
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 100,
    sortFn: sortByCreatedAtDesc,
  });
  return {
    challenges: items.map((row) => toChallengePublic(row)),
    pagination,
  };
}

async function updateChallenge(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "createdBy", "enrollmentCount"]);
  const entries = [];

  for (const [key, value] of Object.entries(updates || {})) {
    if (blockedFields.has(key) || value === undefined) continue;
    if (key === "title") entries.push([key, normalizeTitle(value)]);
    else if (key === "description") entries.push([key, normalizeDescription(value)]);
    else if (key === "price") entries.push([key, normalizePrice(value)]);
    else if (key === "currency") entries.push([key, String(value || "INR").toUpperCase()]);
    else if (key === "images") entries.push([key, normalizeImages(value)]);
    else if (key === "startDate") entries.push([key, normalizeDateOnly(value, "startDate")]);
    else if (key === "endDate") entries.push([key, normalizeDateOnly(value, "endDate")]);
    else if (key === "status") entries.push([key, normalizeStatus(value)]);
    else if (key === "onboardingStepKeys") entries.push([key, normalizeOnboardingStepKeys(value)]);
    else if (key === "whatsappMessageTemplate") entries.push([key, String(value || "").trim()]);
    else if (key === "maxGroupSize") entries.push([key, normalizeMaxGroupSize(value)]);
    else entries.push([key, value]);
  }

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
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

  return toChallengePublic(Attributes || null);
}

async function incrementChallengeEnrollmentCount(id, delta = 1) {
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET enrollmentCount = if_not_exists(enrollmentCount, :zero) + :delta, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":zero": 0,
        ":delta": Number(delta) || 1,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return toChallengePublic(Attributes || null);
}

async function deleteChallenge(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  normalizeStatus,
  normalizePrice,
  normalizeOnboardingStepKeys,
  toChallengePublic,
  createChallenge,
  getChallengeById,
  getChallengeRecordById,
  listChallenges,
  listPublishedChallenges,
  updateChallenge,
  incrementChallengeEnrollmentCount,
  deleteChallenge,
};
