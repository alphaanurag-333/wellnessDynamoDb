const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { toIsoDateOnly, toRecordedAtFromDateOnly } = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressMenstrualCycle";

function buildMenstrualCycleItem(input, { id, now }) {
  const startDate = toIsoDateOnly(input.startDate);
  const endDate = toIsoDateOnly(input.endDate);
  if (!startDate || !endDate) {
    throw new Error("startDate and endDate are required");
  }
  if (endDate < startDate) {
    throw new Error("endDate must be on or after startDate");
  }

  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    startDate,
    endDate,
    recordedAt: input.recordedAt || toRecordedAtFromDateOnly(startDate),
    createdAt: now,
    updatedAt: now,
  };
}

async function createMenstrualCycleLog(input) {
  const now = new Date().toISOString();
  const item = buildMenstrualCycleItem(input, { now });
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

async function getMenstrualCycleLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listMenstrualCycleLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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

function toPublicMenstrualCycleLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
  };
}

module.exports = {
  TABLE,
  buildMenstrualCycleItem,
  createMenstrualCycleLog,
  getMenstrualCycleLogById,
  listMenstrualCycleLogsByUser,
  toPublicMenstrualCycleLog,
};
