const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "ChallengeEnrollment";
const ALLOWED_STATUS = new Set([
  "booked",
  "active",
  "completed",
  "cancelled",
  "refunded",
]);

function normalizeStatus(value, fallback = "booked") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function toPublic(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

async function createEnrollment(payload) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    challengeId: String(payload.challengeId || "").trim(),
    userId: String(payload.userId || "").trim(),
    status: normalizeStatus(payload.status, "booked"),
    transactionId: payload.transactionId || null,
    amountPaid: Number(payload.amountPaid) || 0,
    couponCode: payload.couponCode || null,
    discountAmount: Number(payload.discountAmount) || 0,
    wasOriginallyPaid: Boolean(payload.wasOriginallyPaid),
    previousUserTier: payload.previousUserTier || null,
    previousAccessSnapshot: payload.previousAccessSnapshot || null,
    groupId: payload.groupId || null,
    coachId: payload.coachId || null,
    accessGrantedAt: payload.accessGrantedAt || null,
    accessRevokedAt: payload.accessRevokedAt || null,
    challengeTitle: payload.challengeTitle || null,
    challengeStartDate: payload.challengeStartDate || null,
    challengeEndDate: payload.challengeEndDate || null,
    temporaryAccess: payload.temporaryAccess !== false && !payload.wasOriginallyPaid,
    createdAt: now,
    updatedAt: now,
  };

  if (!item.challengeId || !item.userId) {
    const err = new Error("challengeId and userId are required");
    err.name = "ValidationError";
    throw err;
  }

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  return toPublic(item);
}

async function getEnrollmentById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return toPublic(Item || null);
}

async function updateEnrollment(id, updates) {
  const blocked = new Set(["id", "_id", "createdAt", "challengeId", "userId"]);
  const entries = Object.entries(updates || {}).filter(
    ([key, value]) => !blocked.has(key) && value !== undefined
  );
  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    const next = key === "status" ? normalizeStatus(value) : value;
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = next;
    setExpr += `, #${key} = :${key}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublic(Attributes || null);
}

async function listEnrollmentsByChallengeId(challengeId, { page = 1, limit = 50, status } = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "ChallengeIdCreatedAtIndex",
    partitionKeyName: "challengeId",
    partitionKeyValue: String(challengeId || "").trim(),
    filterExpression: status ? "#status = :status" : undefined,
    exprNames: status ? { "#status": "status" } : undefined,
    exprValues: status ? { ":status": normalizeStatus(status) } : undefined,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });
  return { enrollments: items.map(toPublic), pagination };
}

async function listEnrollmentsByUserId(userId, { page = 1, limit = 50, status } = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId || "").trim(),
    filterExpression: status ? "#status = :status" : undefined,
    exprNames: status ? { "#status": "status" } : undefined,
    exprValues: status ? { ":status": normalizeStatus(status) } : undefined,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });
  return { enrollments: items.map(toPublic), pagination };
}

async function findActiveOrBookedEnrollment(userId, challengeId) {
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "UserIdCreatedAtIndex",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": String(userId || "").trim(),
      },
      ScanIndexForward: false,
      Limit: 50,
    })
  );
  const cid = String(challengeId || "").trim();
  return (
    (Items || [])
      .map(toPublic)
      .find(
        (row) =>
          row.challengeId === cid &&
          (row.status === "booked" || row.status === "active")
      ) || null
  );
}

async function listEnrollmentsByStatus(status, { page = 1, limit = 200 } = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizeStatus(status),
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 500,
    sortFn: sortByCreatedAtDesc,
  });
  return { enrollments: items.map(toPublic), pagination };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  normalizeStatus,
  createEnrollment,
  getEnrollmentById,
  updateEnrollment,
  listEnrollmentsByChallengeId,
  listEnrollmentsByUserId,
  findActiveOrBookedEnrollment,
  listEnrollmentsByStatus,
};
