const {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");

const TABLE = "UserSupplementDosage";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const PERIODS = new Set(["morning", "afternoon", "evening"]);
const MEAL_RELATIONS = new Set(["before", "after"]);
const STATUSES = new Set(["active", "stopped"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeStartDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error("startDate is required");
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("startDate must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function addDaysToDate(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function normalizePeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    const err = new Error("At least one dosage period is required");
    err.name = "ValidationError";
    throw err;
  }

  const seen = new Set();
  const normalized = [];

  for (const row of periods) {
    const period = String(row.period || "").trim().toLowerCase();
    if (!PERIODS.has(period)) {
      const err = new Error("period must be morning, afternoon, or evening");
      err.name = "ValidationError";
      throw err;
    }
    if (seen.has(period)) {
      const err = new Error(`Duplicate period: ${period}`);
      err.name = "ValidationError";
      throw err;
    }
    seen.add(period);

    const quantity = Number(row.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      const err = new Error(`quantity must be > 0 for ${period}`);
      err.name = "ValidationError";
      throw err;
    }

    const mealRelation = String(row.mealRelation || "").trim().toLowerCase();
    if (!MEAL_RELATIONS.has(mealRelation)) {
      const err = new Error("mealRelation must be before or after");
      err.name = "ValidationError";
      throw err;
    }

    normalized.push({
      period,
      quantity: Math.floor(quantity),
      mealRelation,
    });
  }

  const order = { morning: 0, afternoon: 1, evening: 2 };
  normalized.sort((a, b) => (order[a.period] ?? 0) - (order[b.period] ?? 0));
  return normalized;
}

function computeDosageMetrics(packSize, periods) {
  const totalPerDay = (periods || []).reduce(
    (sum, row) => sum + (Number(row.quantity) || 0),
    0
  );
  if (totalPerDay <= 0) {
    const err = new Error("totalPerDay must be greater than 0");
    err.name = "ValidationError";
    throw err;
  }
  const size = Number(packSize) || 0;
  if (size <= 0) {
    const err = new Error("packSize must be greater than 0");
    err.name = "ValidationError";
    throw err;
  }
  const durationDays = Math.floor(size / totalPerDay);
  if (durationDays < 1) {
    const err = new Error("Pack size is too small for the daily dosage");
    err.name = "ValidationError";
    throw err;
  }
  return { totalPerDay, durationDays };
}

function toUserSupplementDosagePublic(item, extras = {}) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    supplementId: row.supplementId,
    name: row.name,
    unit: row.unit,
    packSize: Number(row.packSize) || 0,
    periods: Array.isArray(row.periods) ? row.periods : [],
    totalPerDay: Number(row.totalPerDay) || 0,
    durationDays: Number(row.durationDays) || 0,
    startDate: row.startDate,
    endDate: row.endDate,
    status: STATUSES.has(String(row.status || "").toLowerCase())
      ? String(row.status).toLowerCase()
      : "active",
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ...extras,
  };
}

async function queryUserSupplementDosagesByUserId(userId) {
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

async function listUserSupplementDosagesByUserId(userId, { includeStopped = true } = {}) {
  const items = await queryUserSupplementDosagesByUserId(userId);
  return items
    .filter((row) => includeStopped || String(row.status || "").toLowerCase() !== "stopped")
    .map((row) => toUserSupplementDosagePublic(row))
    .filter(Boolean);
}

async function getUserSupplementDosageRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getUserSupplementDosageById(id) {
  const item = await getUserSupplementDosageRecordById(id);
  return item ? toUserSupplementDosagePublic(item) : null;
}

async function createUserSupplementDosage({
  userId,
  coachId,
  supplementId,
  name,
  unit,
  packSize,
  startDate,
  periods,
  createdByRole = "wellness_coach",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(createdById || "").trim();
  const sid = String(supplementId || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("createdById is required");
  if (!sid) throw new Error("supplementId is required");

  const normalizedPeriods = normalizePeriods(periods);
  const normalizedStart = normalizeStartDate(startDate);
  const { totalPerDay, durationDays } = computeDosageMetrics(packSize, normalizedPeriods);
  const endDate = addDaysToDate(normalizedStart, durationDays - 1);
  const now = new Date().toISOString();

  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    supplementId: sid,
    name: String(name || "").trim(),
    unit: String(unit || "").trim(),
    packSize: Number(packSize) || 0,
    periods: normalizedPeriods,
    totalPerDay,
    durationDays,
    startDate: normalizedStart,
    endDate,
    status: "active",
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

  return toUserSupplementDosagePublic(item);
}

async function stopUserSupplementDosage(id) {
  const record = await getUserSupplementDosageRecordById(id);
  if (!record) {
    const err = new Error("Dosage plan not found");
    err.name = "NotFoundError";
    throw err;
  }

  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET #status = :status, updatedAt = :updatedAt",
      ExpressionAttributeNames: { "#status": "status" },
      ExpressionAttributeValues: {
        ":status": "stopped",
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toUserSupplementDosagePublic(Attributes);
}

module.exports = {
  PERIODS,
  MEAL_RELATIONS,
  createUserSupplementDosage,
  getUserSupplementDosageById,
  getUserSupplementDosageRecordById,
  listUserSupplementDosagesByUserId,
  stopUserSupplementDosage,
  toUserSupplementDosagePublic,
  normalizePeriods,
  normalizeStartDate,
  computeDosageMetrics,
  addDaysToDate,
  normalizeCreatedByRole,
};
