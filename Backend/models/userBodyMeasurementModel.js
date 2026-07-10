const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");

const TABLE = "UserBodyMeasurement";

const ACTIVITY_LEVELS = new Set([
  "sedentary",
  "lightly_active",
  "moderately_active",
  "highly_active",
]);

function normalizeActivityLevel(value) {
  if (value == null || value === "") return null;
  const next = String(value).toLowerCase().trim();
  return ACTIVITY_LEVELS.has(next) ? next : null;
}

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildBodyMeasurementItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    heightCm: toNumberOrNull(input.heightCm),
    heightUnit: input.heightUnit ? String(input.heightUnit) : "cm",
    weightKg: toNumberOrNull(input.weightKg),
    weightUnit: input.weightUnit ? String(input.weightUnit) : "kg",
    weightPicKey: input.weightPicKey ? String(input.weightPicKey) : null,
    neckCm: toNumberOrNull(input.neckCm),
    shoulderCm: toNumberOrNull(input.shoulderCm),
    chestCm: toNumberOrNull(input.chestCm),
    waistCm: toNumberOrNull(input.waistCm),
    hipCm: toNumberOrNull(input.hipCm),
    thighsCm: toNumberOrNull(input.thighsCm),
    activityLevel: normalizeActivityLevel(input.activityLevel),
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createBodyMeasurement(input) {
  const now = new Date().toISOString();
  const item = buildBodyMeasurementItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getBodyMeasurementById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listBodyMeasurementsByUser(userId, { page = 1, limit = 20 } = {}) {
  if (!userId) return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit,
  });
}

async function getLatestBodyMeasurementForUser(userId) {
  const result = await listBodyMeasurementsByUser(userId, { page: 1, limit: 1 });
  return result.items[0] || null;
}

function toPublicBodyMeasurement(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    weightPicUrl: item.weightPicKey ? resolvePublicUrl(item.weightPicKey) : null,
  };
}

module.exports = {
  TABLE,
  ACTIVITY_LEVELS,
  normalizeActivityLevel,
  buildBodyMeasurementItem,
  createBodyMeasurement,
  getBodyMeasurementById,
  listBodyMeasurementsByUser,
  getLatestBodyMeasurementForUser,
  toPublicBodyMeasurement,
};
