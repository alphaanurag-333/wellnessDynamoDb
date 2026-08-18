const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "UserProtocolSetting";
const MAX_POINTS = 50;
const MAX_POINT_LENGTH = 500;

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizePoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    const err = new Error("At least one protocol point is required");
    err.name = "ValidationError";
    throw err;
  }
  if (points.length > MAX_POINTS) {
    const err = new Error(`A protocol cannot have more than ${MAX_POINTS} points`);
    err.name = "ValidationError";
    throw err;
  }

  const next = points
    .map((point) => String(point ?? "").trim())
    .filter(Boolean);

  if (!next.length) {
    const err = new Error("At least one protocol point is required");
    err.name = "ValidationError";
    throw err;
  }

  for (let i = 0; i < next.length; i += 1) {
    if (next[i].length > MAX_POINT_LENGTH) {
      const err = new Error(`Point ${i + 1} cannot exceed ${MAX_POINT_LENGTH} characters`);
      err.name = "ValidationError";
      throw err;
    }
  }

  return next;
}

function toPublicProtocolVersion(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    version: Number(row.version) || 0,
    points: Array.isArray(row.points) ? row.points : [],
    savedById: row.savedById || null,
    savedByRole: row.savedByRole || null,
    savedByName: row.savedByName || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listProtocolVersionsByUserId(userId, { page = 1, limit = 100 } = {}) {
  const uid = String(userId || "").trim();
  if (!uid) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }

  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: uid,
    page,
    limit,
    scanIndexForward: false,
  });
}

async function getLatestProtocolVersion(userId) {
  const result = await listProtocolVersionsByUserId(userId, { page: 1, limit: 1 });
  return result.items[0] || null;
}

async function getProtocolVersionById(id) {
  const key = String(id || "").trim();
  if (!key) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id: key } })
  );
  return Item || null;
}

async function createProtocolVersion({
  userId,
  points,
  savedById,
  savedByRole,
  savedByName,
}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("userId is required");

  const latest = await getLatestProtocolVersion(uid);
  const version = (Number(latest?.version) || 0) + 1;
  const now = new Date().toISOString();

  const item = {
    id: uuidv4(),
    userId: uid,
    version,
    points: normalizePoints(points),
    savedById: savedById ? String(savedById) : null,
    savedByRole: savedByRole ? String(savedByRole) : null,
    savedByName: savedByName ? String(savedByName).trim() || null : null,
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

module.exports = {
  TABLE,
  MAX_POINTS,
  MAX_POINT_LENGTH,
  normalizePoints,
  toPublicProtocolVersion,
  listProtocolVersionsByUserId,
  getLatestProtocolVersion,
  getProtocolVersionById,
  createProtocolVersion,
};
