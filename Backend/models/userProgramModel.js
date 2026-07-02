const { v4: uuidv4 } = require("uuid");
const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "UserProgram";
const COACH_TYPES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const STATUSES = new Set(["assigned", "purchased", "cancelled"]);

function normalizeCoachType(value, fallback = "wellness_coach") {
  const next = String(value || fallback).toLowerCase().trim();
  return COACH_TYPES.has(next) ? next : fallback;
}

function normalizeStatus(value, fallback = "assigned") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUSES.has(next) ? next : fallback;
}

function buildUserProgramItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    coachId: String(input.coachId || "").trim(),
    coachType: normalizeCoachType(input.coachType),
    catalogProgramId: String(input.catalogProgramId || "").trim(),
    title: String(input.title || "").trim(),
    programType: String(input.programType || "goal_based").toLowerCase().trim(),
    description: input.description != null ? String(input.description) : "",
    price: Number(input.price) || 0,
    currency: String(input.currency || "INR").toUpperCase(),
    enabled: Boolean(input.enabled),
    status: normalizeStatus(input.status),
    transactionId: input.transactionId ? String(input.transactionId) : null,
    purchasedAt: input.purchasedAt || null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createUserProgram(input) {
  const now = new Date().toISOString();
  const item = buildUserProgramItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (!item.coachId) throw new Error("coachId is required");
  if (!item.catalogProgramId) throw new Error("catalogProgramId is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getUserProgramById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function updateUserProgram(id, updates) {
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let updateExpr = "SET updatedAt = :updatedAt";

  for (const [key, val] of Object.entries(updates || {})) {
    if (val === undefined) continue;
    if (key === "id" || key === "createdAt") continue;
    let value = val;
    if (key === "coachType") value = normalizeCoachType(val);
    if (key === "status") value = normalizeStatus(val);
    if (key === "enabled") value = Boolean(val);
    if (key === "price") value = Number(val) || 0;
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = value;
    updateExpr += `, #${key} = :${key}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return Attributes;
}

async function listUserProgramsByUserId(userId, { page = 1, limit = 20 } = {}) {
  if (!userId) return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit,
  });
}

async function listUserProgramsByCoachId(coachId, { page = 1, limit = 20 } = {}) {
  if (!coachId) return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  return queryPartition({
    tableName: TABLE,
    indexName: "CoachIdCreatedAtIndex",
    partitionKeyName: "coachId",
    partitionKeyValue: String(coachId),
    page,
    limit,
  });
}

async function cancelAssignedProgramsForUser(userId, { exceptId } = {}) {
  const result = await listUserProgramsByUserId(userId, { page: 1, limit: 50 });
  const now = new Date().toISOString();
  const cancelled = [];
  for (const row of result.items) {
    if (normalizeStatus(row.status) !== "assigned") continue;
    if (exceptId && row.id === exceptId) continue;
    const updated = await updateUserProgram(row.id, {
      status: "cancelled",
      enabled: false,
      updatedAt: now,
    });
    cancelled.push(updated);
  }
  return cancelled;
}

async function getActiveProgramForUser(userId) {
  if (!userId) return null;
  const result = await listUserProgramsByUserId(userId, { page: 1, limit: 50 });
  const active = result.items.filter((p) => normalizeStatus(p.status) !== "cancelled");
  if (active.length === 0) return null;
  active.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return active[0];
}

async function getPurchasableProgramForUser(userId) {
  const program = await getActiveProgramForUser(userId);
  if (!program) return null;
  if (normalizeStatus(program.status) !== "assigned") return null;
  if (!program.enabled) return null;
  return program;
}

async function isProgramCatalogReferenced(catalogProgramId) {
  const slug = String(catalogProgramId || "").trim();
  if (!slug) return false;

  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "#catalogProgramId = :catalogProgramId",
        ExpressionAttributeNames: { "#catalogProgramId": "catalogProgramId" },
        ExpressionAttributeValues: { ":catalogProgramId": slug },
        ExclusiveStartKey: lastKey,
        Limit: 50,
      })
    );
    if ((Items || []).length > 0) return true;
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return false;
}

function toPublicUserProgram(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

module.exports = {
  TABLE,
  COACH_TYPES,
  STATUSES,
  normalizeCoachType,
  normalizeStatus,
  buildUserProgramItem,
  createUserProgram,
  getUserProgramById,
  updateUserProgram,
  listUserProgramsByUserId,
  listUserProgramsByCoachId,
  cancelAssignedProgramsForUser,
  getActiveProgramForUser,
  getPurchasableProgramForUser,
  isProgramCatalogReferenced,
  toPublicUserProgram,
};
