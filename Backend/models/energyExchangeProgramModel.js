const { v4: uuidv4 } = require("uuid");
const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "EnergyExchangeProgram";

const COACH_TYPES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function normalizeCoachType(value, fallback = "wellness_coach") {
  const next = String(value || fallback).toLowerCase().trim();
  return COACH_TYPES.has(next) ? next : fallback;
}

function normalizeFyDiscounts(value) {
  if (value == null) return {};
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return {};
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return {};
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const key = String(k).trim();
    const num = Number(v);
    if (!key || !Number.isFinite(num)) continue;
    out[key] = Math.max(0, Math.min(100, num));
  }
  return out;
}

function normalizeTimeBasedDiscount(value) {
  if (value == null) return null;
  let raw = value;
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (typeof raw !== "object" || Array.isArray(raw)) return null;
  const percentage = Number(raw.percentage);
  if (!Number.isFinite(percentage) || percentage <= 0) return null;
  const startsAt = raw.startsAt ? new Date(raw.startsAt).toISOString() : null;
  const endsAt = raw.endsAt ? new Date(raw.endsAt).toISOString() : null;
  return {
    percentage: Math.max(0, Math.min(100, percentage)),
    startsAt,
    endsAt,
    note: raw.note ? String(raw.note).trim() : null,
  };
}

function buildProgramItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    coachId: String(input.coachId || "").trim(),
    coachType: normalizeCoachType(input.coachType),
    title: String(input.title || "").trim() || "Personalized Program",
    programType: String(input.programType || "").trim() || "Goal based / Lifetime Membership",
    description: input.description != null ? String(input.description) : "",
    enabled: Boolean(input.enabled),
    monthlyAmount: Number(input.monthlyAmount) || 0,
    currency: String(input.currency || "INR").toUpperCase(),
    fyDiscounts: normalizeFyDiscounts(input.fyDiscounts),
    timeBasedDiscount: normalizeTimeBasedDiscount(input.timeBasedDiscount),
    createdAt: now,
    updatedAt: now,
  };
}

async function createProgram(input) {
  const now = new Date().toISOString();
  const item = buildProgramItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (!item.coachId) throw new Error("coachId is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getProgramById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function updateProgram(id, updates) {
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let updateExpr = "SET updatedAt = :updatedAt";

  for (const [key, val] of Object.entries(updates || {})) {
    if (val === undefined) continue;
    if (key === "id" || key === "createdAt") continue;
    let value = val;
    if (key === "fyDiscounts") value = normalizeFyDiscounts(val);
    if (key === "timeBasedDiscount") value = normalizeTimeBasedDiscount(val);
    if (key === "coachType") value = normalizeCoachType(val);
    if (key === "enabled") value = Boolean(val);
    if (key === "monthlyAmount") value = Number(val) || 0;
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

async function deleteProgram(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listProgramsByUserId(userId, { page = 1, limit = 20 } = {}) {
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

async function listProgramsByCoachId(coachId, { page = 1, limit = 20 } = {}) {
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

async function getEnabledProgramForUser(userId) {
  if (!userId) return null;
  const result = await listProgramsByUserId(userId, { page: 1, limit: 50 });
  const enabled = result.items.filter((p) => p.enabled);
  if (enabled.length === 0) return null;
  enabled.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return enabled[0];
}

function toPublicProgram(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

module.exports = {
  TABLE,
  COACH_TYPES,
  normalizeCoachType,
  normalizeFyDiscounts,
  normalizeTimeBasedDiscount,
  buildProgramItem,
  createProgram,
  getProgramById,
  updateProgram,
  deleteProgram,
  listProgramsByUserId,
  listProgramsByCoachId,
  getEnabledProgramForUser,
  toPublicProgram,
};
