const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");
const { toNumberOrNull } = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressBloodPressure";

function buildBloodPressureItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    sys: toNumberOrNull(input.sys),
    dia: toNumberOrNull(input.dia),
    bpPicKey: input.bpPicKey ? String(input.bpPicKey) : null,
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createBloodPressureLog(input) {
  const now = new Date().toISOString();
  const item = buildBloodPressureItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (item.sys == null) throw new Error("sys is required");
  if (item.dia == null) throw new Error("dia is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getBloodPressureLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listBloodPressureLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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

function toPublicBloodPressureLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    bpPicUrl: item.bpPicKey ? resolvePublicUrl(item.bpPicKey) : null,
  };
}

module.exports = {
  TABLE,
  buildBloodPressureItem,
  createBloodPressureLog,
  getBloodPressureLogById,
  listBloodPressureLogsByUser,
  toPublicBloodPressureLog,
};
