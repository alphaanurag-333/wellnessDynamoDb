const { GetCommand, PutCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "UserCoachInsight";
const MAX_MESSAGE_LENGTH = 500;

function normalizeMessage(value) {
  const message = String(value ?? "").trim();
  if (!message) {
    const err = new Error("message is required");
    err.name = "ValidationError";
    throw err;
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    const err = new Error(`message must be at most ${MAX_MESSAGE_LENGTH} characters`);
    err.name = "ValidationError";
    throw err;
  }
  return message;
}

function toPublicCoachInsight(item) {
  if (!item) return null;
  return {
    userId: item.userId,
    message: item.message,
    updatedByCoachId: item.updatedByCoachId ?? null,
    updatedByCoachType: item.updatedByCoachType ?? null,
    createdAt: item.createdAt ?? null,
    updatedAt: item.updatedAt ?? null,
  };
}

async function getCoachInsightByUserId(userId) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId: String(userId) },
    })
  );
  return Item ? toPublicCoachInsight(Item) : null;
}

async function upsertCoachInsight(userId, { message, updatedByCoachId, updatedByCoachType }) {
  const normalizedMessage = normalizeMessage(message);
  const now = new Date().toISOString();
  const existing = await getCoachInsightByUserId(userId);

  const item = {
    userId: String(userId),
    message: normalizedMessage,
    updatedByCoachId: updatedByCoachId ? String(updatedByCoachId) : null,
    updatedByCoachType: updatedByCoachType ? String(updatedByCoachType) : null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return toPublicCoachInsight(item);
}

async function deleteCoachInsight(userId) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { userId: String(userId) },
    })
  );
}

module.exports = {
  MAX_MESSAGE_LENGTH,
  getCoachInsightByUserId,
  upsertCoachInsight,
  deleteCoachInsight,
  toPublicCoachInsight,
};
