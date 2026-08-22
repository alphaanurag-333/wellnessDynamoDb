const { v4: uuidv4 } = require("uuid");
const { PutCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "UserGutReset";
const MAX_POINTS = 50;
const MAX_POINT_LENGTH = 500;
const STATUSES = new Set(["active", "completed"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeIsoDate(value, fieldName) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const err = new Error(`${fieldName} must be a valid YYYY-MM-DD date`);
    err.name = "ValidationError";
    throw err;
  }
  return raw;
}

function normalizePoints(points) {
  if (!Array.isArray(points) || points.length === 0) {
    const err = new Error("At least one plan point is required");
    err.name = "ValidationError";
    throw err;
  }
  if (points.length > MAX_POINTS) {
    const err = new Error(`A gut reset plan cannot have more than ${MAX_POINTS} points`);
    err.name = "ValidationError";
    throw err;
  }

  const next = points
    .map((point) => String(point ?? "").trim())
    .filter(Boolean);

  if (!next.length) {
    const err = new Error("At least one plan point is required");
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

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUSES.has(next) ? next : fallback;
}

function toPublicGutReset(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    status: normalizeStatus(row.status),
    startDate: row.startDate || "",
    fruitVegDate: row.fruitVegDate || "",
    waterFastDate: row.waterFastDate || "",
    points: Array.isArray(row.points) ? row.points : [],
    savedById: row.savedById || null,
    savedByRole: row.savedByRole || null,
    savedByName: row.savedByName || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function listGutResetsByUserId(userId, { page = 1, limit = 100 } = {}) {
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

async function completeActiveGutResets(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return;

  const result = await listGutResetsByUserId(uid, { page: 1, limit: 100 });
  const activeItems = result.items.filter((item) => normalizeStatus(item.status) === "active");
  if (!activeItems.length) return;

  const now = new Date().toISOString();
  await Promise.all(
    activeItems.map((item) =>
      docClient.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { id: item.id },
          UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: {
            ":status": "completed",
            ":updatedAt": now,
          },
        })
      )
    )
  );
}

async function createGutReset({
  userId,
  startDate,
  fruitVegDate,
  waterFastDate,
  points,
  savedById,
  savedByRole,
  savedByName,
}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("userId is required");

  const normalizedStartDate = normalizeIsoDate(startDate, "startDate");
  if (!normalizedStartDate) {
    const err = new Error("startDate is required");
    err.name = "ValidationError";
    throw err;
  }

  await completeActiveGutResets(uid);

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    status: "active",
    startDate: normalizedStartDate,
    fruitVegDate: normalizeIsoDate(fruitVegDate, "fruitVegDate") || "",
    waterFastDate: normalizeIsoDate(waterFastDate, "waterFastDate") || "",
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
  toPublicGutReset,
  listGutResetsByUserId,
  completeActiveGutResets,
  createGutReset,
};
