const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");

const TABLE = "UserProgressPhoto";

function toNumberOrNull(value) {
  if (value === undefined || value === null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function buildProgressPhotoItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    frontPicKey: input.frontPicKey ? String(input.frontPicKey) : null,
    rightPicKey: input.rightPicKey ? String(input.rightPicKey) : null,
    leftPicKey: input.leftPicKey ? String(input.leftPicKey) : null,
    heightCm: toNumberOrNull(input.heightCm),
    weightKg: toNumberOrNull(input.weightKg),
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createProgressPhoto(input) {
  const now = new Date().toISOString();
  const item = buildProgressPhotoItem(input, { now });
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

async function getProgressPhotoById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listProgressPhotosByUser(userId, { page = 1, limit = 20 } = {}) {
  if (!userId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }
  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit,
    scanIndexForward: false,
  });
}

function toPublicProgressPhoto(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    frontPicUrl: item.frontPicKey ? resolvePublicUrl(item.frontPicKey) : null,
    rightPicUrl: item.rightPicKey ? resolvePublicUrl(item.rightPicKey) : null,
    leftPicUrl: item.leftPicKey ? resolvePublicUrl(item.leftPicKey) : null,
  };
}

module.exports = {
  TABLE,
  buildProgressPhotoItem,
  createProgressPhoto,
  getProgressPhotoById,
  listProgressPhotosByUser,
  toPublicProgressPhoto,
};
