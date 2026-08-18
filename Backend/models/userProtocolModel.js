const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");

const TABLE = "UserProtocol";

function normalizePoints(raw) {
  if (!Array.isArray(raw)) {
    const err = new Error("points must be an array");
    err.name = "ValidationError";
    throw err;
  }
  const points = raw.map((p) => String(p || "").trim()).filter(Boolean);
  if (!points.length) {
    const err = new Error("At least one protocol point is required");
    err.name = "ValidationError";
    throw err;
  }
  return points;
}

function toPublicProtocol(item) {
  if (!item) return null;
  return {
    id: item.id,
    _id: item.id,
    userId: item.userId,
    version: Number(item.version) || 1,
    points: Array.isArray(item.points) ? item.points : [],
    savedById: item.savedById || null,
    savedByRole: item.savedByRole || null,
    savedByName: item.savedByName || null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createUserProtocol(input) {
  const userId = String(input.userId || "").trim();
  if (!userId) throw new Error("userId is required");
  const points = normalizePoints(input.points);
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId,
    version: Number(input.version) || 1,
    points,
    savedById: input.savedById ? String(input.savedById) : null,
    savedByRole: input.savedByRole ? String(input.savedByRole) : null,
    savedByName: input.savedByName ? String(input.savedByName) : null,
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

async function getUserProtocolById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id: String(id) } })
  );
  return Item || null;
}

async function listUserProtocolsByUserId(userId) {
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
  return items.sort((a, b) => (Number(b.version) || 0) - (Number(a.version) || 0));
}

async function getLatestUserProtocolByUserId(userId) {
  const items = await listUserProtocolsByUserId(userId);
  return items[0] || null;
}

module.exports = {
  TABLE,
  toPublicProtocol,
  createUserProtocol,
  getUserProtocolById,
  listUserProtocolsByUserId,
  getLatestUserProtocolByUserId,
};
