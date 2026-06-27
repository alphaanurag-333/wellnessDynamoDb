const { v4: uuidv4 } = require("uuid");
const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "EnergyExchangeSubscription";

const STATUSES = new Set(["queued", "active", "expired", "refunded", "pending"]);

function normalizeStatus(value, fallback = "queued") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUSES.has(next) ? next : fallback;
}

function buildSubscriptionItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    programId: String(input.programId || "").trim(),
    transactionId: input.transactionId ? String(input.transactionId).trim() : null,
    fyStartYear: Number(input.fyStartYear) || 0,
    monthsCovered: Number(input.monthsCovered) || 0,
    monthlyRate: Number(input.monthlyRate) || 0,
    discountPercent: Number(input.discountPercent) || 0,
    fyTierDiscountPercent: Number(input.fyTierDiscountPercent) || 0,
    timeBasedDiscountPercent: Number(input.timeBasedDiscountPercent) || 0,
    baseAmount: Number(input.baseAmount) || 0,
    discountAmount: Number(input.discountAmount) || 0,
    taxAmount: Number(input.taxAmount) || 0,
    taxPercent: Number(input.taxPercent) || 0,
    taxType: input.taxType ? String(input.taxType) : "exclusive",
    totalAmount: Number(input.totalAmount) || 0,
    currency: String(input.currency || "INR").toUpperCase(),
    startsAt: input.startsAt || null,
    endsAt: input.endsAt || null,
    status: normalizeStatus(input.status, "queued"),
    activatedAt: input.activatedAt || null,
    expiredAt: input.expiredAt || null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createSubscription(input) {
  const now = new Date().toISOString();
  const item = buildSubscriptionItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (!item.programId) throw new Error("programId is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getSubscriptionById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function updateSubscription(id, updates) {
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let updateExpr = "SET updatedAt = :updatedAt";

  for (const [key, val] of Object.entries(updates || {})) {
    if (val === undefined) continue;
    if (key === "id" || key === "createdAt") continue;
    let value = val;
    if (key === "status") value = normalizeStatus(val);
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

async function listSubscriptionsByUserId(userId, { status, page = 1, limit = 50 } = {}) {
  if (!userId) return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };

  if (status) {
    const { Items = [] } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserIdStatusIndex",
        KeyConditionExpression: "#userId = :userId AND #status = :status",
        ExpressionAttributeNames: { "#userId": "userId", "#status": "status" },
        ExpressionAttributeValues: { ":userId": String(userId), ":status": normalizeStatus(status) },
      })
    );
    return { items: Items, pagination: { page: 1, limit: Items.length, total: Items.length, pages: 1 } };
  }

  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "UserIdStatusIndex",
      KeyConditionExpression: "#userId = :userId",
      ExpressionAttributeNames: { "#userId": "userId" },
      ExpressionAttributeValues: { ":userId": String(userId) },
    })
  );
  const sorted = [...Items].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Math.min(200, Number(limit) || 50));
  const start = (safePage - 1) * safeLimit;
  return {
    items: sorted.slice(start, start + safeLimit),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: sorted.length,
      pages: Math.max(1, Math.ceil(sorted.length / safeLimit)),
    },
  };
}

async function listSubscriptionsByTransactionId(transactionId) {
  if (!transactionId) return [];
  const { Items = [] } = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: "transactionId = :tid",
      ExpressionAttributeValues: { ":tid": String(transactionId) },
    })
  );
  return Items;
}

async function listActiveSubscriptionsEndingBefore(isoDate) {
  const { Items = [] } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "StatusEndsAtIndex",
      KeyConditionExpression: "#status = :status AND #endsAt <= :endsAt",
      ExpressionAttributeNames: { "#status": "status", "#endsAt": "endsAt" },
      ExpressionAttributeValues: { ":status": "active", ":endsAt": String(isoDate) },
    })
  );
  return Items;
}

function toPublicSubscription(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

module.exports = {
  TABLE,
  STATUSES,
  normalizeStatus,
  buildSubscriptionItem,
  createSubscription,
  getSubscriptionById,
  updateSubscription,
  listSubscriptionsByUserId,
  listSubscriptionsByTransactionId,
  listActiveSubscriptionsEndingBefore,
  toPublicSubscription,
};
