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
const DAY_PARTS = ["morning", "afternoon", "evening"];
const DAY_PART_SET = new Set(DAY_PARTS);
const PERIOD_ORDER = [
  "morning",
  "afternoon",
  "evening",
  "before_1st_meal",
  "before_2nd_meal",
  "before_3rd_meal",
  "before_4th_meal",
  "after_1st_meal",
  "after_2nd_meal",
  "after_3rd_meal",
  "after_4th_meal",
  "empty_stomach_morning",
  "empty_stomach_evening",
  "before_bed_30_mins",
  "after_morning_snacks",
  "before_morning_snacks",
  "after_evening_snacks",
  "before_evening_snacks",
];
const PERIODS = new Set(PERIOD_ORDER);
const MEAL_TIMINGS = PERIOD_ORDER.filter((id) => !DAY_PART_SET.has(id));
const MEAL_TIMING_SET = new Set(MEAL_TIMINGS);
const COMPOSITE_PERIOD_SEP = "__";
const MAX_PERIODS = 4; // hard cap per nutrition, including merged adds
const MEAL_RELATIONS = new Set(["before", "after"]);
const STATUSES = new Set(["active", "stopped"]);

const PERIOD_ORDER_INDEX = PERIOD_ORDER.reduce((acc, id, index) => {
  acc[id] = index;
  return acc;
}, {});

function parseCompositePeriod(period) {
  const raw = String(period || "").trim().toLowerCase();
  const sep = raw.indexOf(COMPOSITE_PERIOD_SEP);
  if (sep <= 0) return null;
  const dayPart = raw.slice(0, sep);
  const mealTiming = raw.slice(sep + COMPOSITE_PERIOD_SEP.length);
  if (!DAY_PART_SET.has(dayPart) || !MEAL_TIMING_SET.has(mealTiming)) return null;
  return { dayPart, mealTiming };
}

function composePeriod(dayPart, mealTiming) {
  return `${dayPart}${COMPOSITE_PERIOD_SEP}${mealTiming}`;
}

function isValidPeriod(period) {
  const raw = String(period || "").trim().toLowerCase();
  return PERIODS.has(raw) || Boolean(parseCompositePeriod(raw));
}

function periodSortIndex(period) {
  const composite = parseCompositePeriod(period);
  if (composite) {
    return (
      (PERIOD_ORDER_INDEX[composite.dayPart] ?? 0) * 1000
      + (PERIOD_ORDER_INDEX[composite.mealTiming] ?? 0)
    );
  }
  return PERIOD_ORDER_INDEX[period] ?? 999999;
}

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

function defaultMealRelationForPeriod(period) {
  const composite = parseCompositePeriod(period);
  const id = composite?.mealTiming || String(period || "");
  if (
    id === "morning"
    || id === "afternoon"
    || id === "evening"
    || id.startsWith("before_")
    || id.startsWith("empty_stomach")
  ) {
    return "before";
  }
  return "after";
}

function normalizePeriods(periods) {
  if (!Array.isArray(periods) || periods.length === 0) {
    const err = new Error("At least one dosage period is required");
    err.name = "ValidationError";
    throw err;
  }
  if (periods.length > MAX_PERIODS) {
    const err = new Error(`Select at most ${MAX_PERIODS} timings`);
    err.name = "ValidationError";
    throw err;
  }

  const seen = new Set();
  const normalized = [];

  for (const row of periods) {
    const period = String(row.period || "").trim().toLowerCase();
    if (!isValidPeriod(period)) {
      const err = new Error("Invalid dosage timing");
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

    let mealRelation = String(row.mealRelation || "").trim().toLowerCase();
    if (!MEAL_RELATIONS.has(mealRelation)) {
      mealRelation = defaultMealRelationForPeriod(period);
    }

    normalized.push({
      period,
      quantity: Math.floor(quantity),
      mealRelation,
    });
  }

  normalized.sort(
    (a, b) => periodSortIndex(a.period) - periodSortIndex(b.period)
  );
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
  PERIOD_ORDER,
  DAY_PARTS,
  DAY_PART_SET,
  MEAL_TIMINGS,
  MEAL_TIMING_SET,
  COMPOSITE_PERIOD_SEP,
  MAX_PERIODS,
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
  parseCompositePeriod,
  composePeriod,
  isValidPeriod,
  periodSortIndex,
  defaultMealRelationForPeriod,
};
