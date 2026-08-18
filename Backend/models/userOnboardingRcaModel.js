const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { resolvePublicUrl } = require("../utils/s3");

const TABLE = "UserOnboardingRca";

function toPublicRca(item) {
  if (!item) return null;
  return {
    id: item.id,
    _id: item.id,
    userId: item.userId,
    notes: item.notes || "",
    fileKey: item.fileKey || null,
    fileUrl: item.fileKey ? resolvePublicUrl(item.fileKey) : null,
    submittedById: item.submittedById || null,
    submittedByRole: item.submittedByRole || null,
    submittedByName: item.submittedByName || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createUserOnboardingRca(input) {
  const userId = String(input.userId || "").trim();
  const notes = String(input.notes || "").trim();
  if (!userId) throw new Error("userId is required");
  if (!notes) {
    const err = new Error("notes is required");
    err.name = "ValidationError";
    throw err;
  }
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId,
    notes,
    fileKey: input.fileKey ? String(input.fileKey).trim() : null,
    submittedById: input.submittedById ? String(input.submittedById) : null,
    submittedByRole: input.submittedByRole ? String(input.submittedByRole) : null,
    submittedByName: input.submittedByName ? String(input.submittedByName) : null,
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
  return item;
}

async function getUserOnboardingRcaById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id: String(id) } })
  );
  return Item || null;
}

async function listUserOnboardingRcasByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];
  const items = [];
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserIdCreatedAtIndex",
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: { "#userId": "userId" },
        ExpressionAttributeValues: { ":userId": uid },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return items;
}

async function getLatestUserOnboardingRcaByUserId(userId) {
  const items = await listUserOnboardingRcasByUserId(userId);
  return items[0] || null;
}

module.exports = {
  TABLE,
  toPublicRca,
  createUserOnboardingRca,
  getUserOnboardingRcaById,
  listUserOnboardingRcasByUserId,
  getLatestUserOnboardingRcaByUserId,
};
