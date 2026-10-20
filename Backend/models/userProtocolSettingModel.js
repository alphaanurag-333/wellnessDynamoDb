const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand, DeleteCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const {
  MAX_POINTS,
  flattenSectionPoints,
  normalizePoints,
  normalizeSections,
  sectionsFromStored,
} = require("../utils/protocolSections");

const TABLE = "UserProtocolSetting";

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicProtocolVersion(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  const sections = sectionsFromStored(row);
  const points = sections.length ? flattenSectionPoints(sections) : [];
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    version: Number(row.version) || 0,
    sections,
    points,
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
  sections,
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
  const normalizedSections = Array.isArray(sections)
    ? normalizeSections(sections)
    : normalizeSections([{ heading: "Protocol", points }]);

  const item = {
    id: uuidv4(),
    userId: uid,
    version,
    sections: normalizedSections,
    points: flattenSectionPoints(normalizedSections),
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

async function updateProtocolVersion({ userId, versionId, sections }) {
  const uid = String(userId || "").trim();
  const id = String(versionId || "").trim();
  if (!uid || !id) {
    const err = new Error("Protocol version is required");
    err.name = "ValidationError";
    throw err;
  }

  const item = await getProtocolVersionById(id);
  if (!item || String(item.userId || "") !== uid) {
    const err = new Error("Protocol version not found");
    err.name = "NotFoundError";
    throw err;
  }

  const normalizedSections = normalizeSections(sections);
  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET sections = :sections, points = :points, updatedAt = :updatedAt",
      ConditionExpression: "attribute_exists(id) AND userId = :userId",
      ExpressionAttributeValues: {
        ":sections": normalizedSections,
        ":points": flattenSectionPoints(normalizedSections),
        ":updatedAt": now,
        ":userId": uid,
      },
      ReturnValues: "ALL_NEW",
    })
  );

  return Attributes || {
    ...item,
    sections: normalizedSections,
    points: flattenSectionPoints(normalizedSections),
    updatedAt: now,
  };
}

async function deleteProtocolVersion({ userId, versionId }) {
  const uid = String(userId || "").trim();
  const id = String(versionId || "").trim();
  if (!uid || !id) {
    const err = new Error("Protocol version is required");
    err.name = "ValidationError";
    throw err;
  }

  const item = await getProtocolVersionById(id);
  if (!item || String(item.userId || "") !== uid) {
    const err = new Error("Protocol version not found");
    err.name = "NotFoundError";
    throw err;
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
    })
  );

  return item;
}

module.exports = {
  TABLE,
  MAX_POINTS,
  normalizePoints,
  toPublicProtocolVersion,
  listProtocolVersionsByUserId,
  getLatestProtocolVersion,
  getProtocolVersionById,
  createProtocolVersion,
  updateProtocolVersion,
  deleteProtocolVersion,
};
