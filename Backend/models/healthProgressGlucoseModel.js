const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");
const {
  toNumberOrNull,
  normalizeGlucoseType,
} = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressGlucose";

function buildGlucoseItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    type: normalizeGlucoseType(input.type),
    value: toNumberOrNull(input.value),
    glucosePicKey: input.glucosePicKey ? String(input.glucosePicKey) : null,
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createGlucoseLog(input) {
  const now = new Date().toISOString();
  const item = buildGlucoseItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (item.value == null) throw new Error("value is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getGlucoseLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listGlucoseLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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

function toPublicGlucoseLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    glucosePicUrl: item.glucosePicKey ? resolvePublicUrl(item.glucosePicKey) : null,
  };
}

module.exports = {
  TABLE,
  buildGlucoseItem,
  createGlucoseLog,
  getGlucoseLogById,
  listGlucoseLogsByUser,
  toPublicGlucoseLog,
};
