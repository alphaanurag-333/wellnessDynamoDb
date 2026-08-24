const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "ChallengeGroup";
const ALLOWED_STATUS = new Set(["open", "full", "closed"]);

function normalizeStatus(value, fallback = "open") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function toPublic(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

async function createChallengeGroup({
  challengeId,
  coachId,
  capacity = 20,
  status = "open",
  label = "",
}) {
  const now = new Date().toISOString();
  const cap = Math.max(1, Math.min(100, Number(capacity) || 20));
  const item = {
    id: uuidv4(),
    challengeId: String(challengeId || "").trim(),
    coachId: String(coachId || "").trim() || null,
    capacity: cap,
    enrolledCount: 0,
    status: normalizeStatus(status),
    label: String(label || "").trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (!item.challengeId) {
    const err = new Error("challengeId is required");
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

async function getChallengeGroupById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return toPublic(Item || null);
}

async function listGroupsByChallengeId(challengeId, { page = 1, limit = 50 } = {}) {
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "ChallengeIdCreatedAtIndex",
    partitionKeyName: "challengeId",
    partitionKeyValue: String(challengeId || "").trim(),
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });
  return { groups: items.map(toPublic), pagination };
}

async function updateChallengeGroup(id, updates) {
  const blocked = new Set(["id", "_id", "createdAt", "challengeId"]);
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
    let next = value;
    if (key === "status") next = normalizeStatus(value);
    if (key === "capacity") next = Math.max(1, Math.min(100, Number(value) || 20));
    if (key === "enrolledCount") next = Math.max(0, Number(value) || 0);
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

async function incrementGroupEnrollmentCount(id, delta = 1) {
  const group = await getChallengeGroupById(id);
  if (!group) return null;
  const nextCount = Math.max(0, (Number(group.enrolledCount) || 0) + (Number(delta) || 1));
  const status =
    nextCount >= (Number(group.capacity) || 20) ? "full" : group.status === "closed" ? "closed" : "open";
  return updateChallengeGroup(id, { enrolledCount: nextCount, status });
}

async function deleteChallengeGroup(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  createChallengeGroup,
  getChallengeGroupById,
  listGroupsByChallengeId,
  updateChallengeGroup,
  incrementGroupEnrollmentCount,
  deleteChallengeGroup,
};
