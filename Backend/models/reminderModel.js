const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");

const { docClient } = require("../config/db");

const TABLE = "Reminder";
const CREATED_BY_ROLES = new Set(["user", "wellness_coach", "assistant_wellness_coach"]);
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "user") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeTime(value) {
  const raw = String(value || "").trim();
  if (!TIME_PATTERN.test(raw)) {
    const err = new Error("time must be in HH:MM 24-hour format");
    err.name = "ValidationError";
    throw err;
  }
  return raw;
}

function normalizeDays(value) {
  if (!Array.isArray(value) || value.length === 0) {
    const err = new Error("days must be a non-empty array of weekday indices (0=Sun … 6=Sat)");
    err.name = "ValidationError";
    throw err;
  }

  const days = [...new Set(value.map((d) => Number(d)).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))];
  if (days.length === 0) {
    const err = new Error("days must include at least one valid weekday index (0–6)");
    err.name = "ValidationError";
    throw err;
  }

  days.sort((a, b) => a - b);
  return days;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  if (!name) {
    const err = new Error("name is required");
    err.name = "ValidationError";
    throw err;
  }
  if (name.length > 120) {
    const err = new Error("name cannot exceed 120 characters");
    err.name = "ValidationError";
    throw err;
  }
  return name;
}

function normalizeIsActive(value, fallback = true) {
  if (value === undefined || value === null) return fallback;
  return Boolean(value);
}

function toPublicReminder(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    name: row.name,
    time: row.time,
    days: row.days,
    isActive: Boolean(row.isActive),
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    isCoachAssigned: normalizeCreatedByRole(row.createdByRole) !== "user",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createReminder({
  userId,
  name,
  time,
  days,
  isActive = true,
  createdByRole = "user",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const creatorId = String(createdById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!creatorId) throw new Error("createdById is required");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    name: normalizeName(name),
    time: normalizeTime(time),
    days: normalizeDays(days),
    isActive: normalizeIsActive(isActive),
    createdByRole: normalizeCreatedByRole(createdByRole),
    createdById: creatorId,
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

  return toPublicReminder(item);
}

async function getReminderRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getReminderById(id) {
  const item = await getReminderRecordById(id);
  return item ? toPublicReminder(item) : null;
}

async function updateReminder(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    const n = `#${key}`;
    const v = `:${key}`;
    exprNames[n] = key;
    if (key === "name") exprValues[v] = normalizeName(value);
    else if (key === "time") exprValues[v] = normalizeTime(value);
    else if (key === "days") exprValues[v] = normalizeDays(value);
    else if (key === "isActive") exprValues[v] = normalizeIsActive(value);
    else exprValues[v] = value;
    setExpr += `, ${n} = ${v}`;
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

  return toPublicReminder(Attributes || null);
}

async function deleteReminder(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function queryRemindersByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserCreatedAtIndex",
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

async function listRemindersByUserId(userId) {
  const items = await queryRemindersByUserId(userId);
  return items.map((row) => toPublicReminder(row)).filter(Boolean);
}

async function toggleReminderActive(id, isActive) {
  return updateReminder(id, { isActive: normalizeIsActive(isActive) });
}

module.exports = {
  createReminder,
  getReminderById,
  getReminderRecordById,
  updateReminder,
  deleteReminder,
  listRemindersByUserId,
  toggleReminderActive,
  normalizeCreatedByRole,
  normalizeTime,
  normalizeDays,
  normalizeName,
  toPublicReminder,
};
