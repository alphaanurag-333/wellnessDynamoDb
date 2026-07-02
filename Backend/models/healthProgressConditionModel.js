const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { resolvePublicUrl } = require("../utils/s3");
const {
  normalizeBodyPart,
  toRecordedAtFromDateOnly,
  toIsoDateOnly,
} = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressCondition";

function buildConditionItem(input, { id, now }) {
  const bodyPart = normalizeBodyPart(input.bodyPart);
  const bodyPartOther =
    bodyPart === "other" && input.bodyPartOther
      ? String(input.bodyPartOther).trim() || null
      : null;

  const dateOnly = toIsoDateOnly(input.recordedAt || input.date);
  const recordedAt = input.recordedAt
    ? input.recordedAt
    : toRecordedAtFromDateOnly(dateOnly);

  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    bodyPart,
    bodyPartOther,
    picKey: input.picKey ? String(input.picKey) : null,
    recordedAt,
    createdAt: now,
    updatedAt: now,
  };
}

async function createConditionLog(input) {
  const now = new Date().toISOString();
  const item = buildConditionItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (!item.picKey) throw new Error("picKey is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getConditionLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listConditionLogsByUser(userId, { page = 1, limit = 50 } = {}) {
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

function toPublicConditionLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
    picUrl: item.picKey ? resolvePublicUrl(item.picKey) : null,
  };
}

module.exports = {
  TABLE,
  buildConditionItem,
  createConditionLog,
  getConditionLogById,
  listConditionLogsByUser,
  toPublicConditionLog,
};
