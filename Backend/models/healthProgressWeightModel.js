const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");
const { toNumberOrNull } = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressWeight";

function buildWeightItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    weightKg: toNumberOrNull(input.weightKg),
    weightPicKey: input.weightPicKey ? String(input.weightPicKey) : null,
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createWeightLog(input) {
  const now = new Date().toISOString();
  const item = buildWeightItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (item.weightKg == null) throw new Error("weightKg is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getWeightLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listWeightLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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

function toPublicWeightLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    weightPicUrl: item.weightPicKey ? resolvePublicUrl(item.weightPicKey) : null,
  };
}

module.exports = {
  TABLE,
  buildWeightItem,
  createWeightLog,
  getWeightLogById,
  listWeightLogsByUser,
  toPublicWeightLog,
};
