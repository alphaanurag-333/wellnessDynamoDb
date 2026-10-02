const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
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

function normalizeWeightReviewStatus(value) {
  const next = String(value || "pending").trim().toLowerCase();
  if (next === "approved" || next === "rejected") return next;
  return "pending";
}

async function reviewWeightPhoto(id, { status, reviewedById, rejectionReason } = {}) {
  const nextStatus = normalizeWeightReviewStatus(status);
  if (nextStatus === "pending") throw new Error("status must be approved or rejected");

  const now = new Date().toISOString();
  const reason = nextStatus === "rejected"
    ? String(rejectionReason || "").trim() || null
    : null;

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression:
        "SET weightReviewStatus = :status, weightReviewedAt = :reviewedAt, weightReviewedById = :reviewedById, weightRejectionReason = :reason, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(id)",
      ExpressionAttributeValues: {
        ":status": nextStatus,
        ":reviewedAt": now,
        ":reviewedById": reviewedById || null,
        ":reason": reason,
        ":updatedAt": now,
      },
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes;
}

function toPublicBodyMeasurement(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    weightPicUrl: item.weightPicKey ? resolvePublicUrl(item.weightPicKey) : null,
    weightReviewStatus: item.weightPicKey ? normalizeWeightReviewStatus(item.weightReviewStatus) : null,
    weightReviewedAt: item.weightReviewedAt || null,
    weightReviewedById: item.weightReviewedById || null,
    weightRejectionReason: item.weightRejectionReason || null,
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
  reviewWeightPhoto,
  toPublicBodyMeasurement,
};
