const {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { isValidDateOnly, parseDateOnly, todayDateOnly } = require("../utils/dateOnly");

const TABLE = "UserSupplementDosage";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const DAY_PARTS = ["morning", "afternoon", "evening", "night"];
const DAY_PART_SET = new Set(DAY_PARTS);
const WC_TIMINGS = ["morning", "evening", "night"];
const WC_TIMING_SET = new Set(WC_TIMINGS);
const FREQUENCY_INTERVALS = {
  daily: 1,
  weekly: 7,
  every_15_days: 15,
  monthly: 30,
};
const FREQUENCIES = new Set([...Object.keys(FREQUENCY_INTERVALS), "custom"]);
const PERIOD_ORDER = [
  "morning",
  "afternoon",
  "evening",
  "night",
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

function validationError(message) {
  const err = new Error(message);
  err.name = "ValidationError";
  return err;
}

function defaultMealRelationForPeriod(period) {
  const composite = parseCompositePeriod(period);
  const id = composite?.mealTiming || String(period || "");
  if (
    id === "morning"
    || id === "afternoon"
    || id === "evening"
    || id === "night"
    || id.startsWith("before_")
    || id.startsWith("empty_stomach")
  ) {
    return "before";
  }
  return "after";
}

function asDateOnly(value) {
  const raw = String(value || "").trim();
  if (isValidDateOnly(raw)) return raw;
  const head = raw.slice(0, 10);
  return isValidDateOnly(head) ? head : "";
}

function daysBetweenIso(startIso, endIso) {
  const start = parseDateOnly(startIso);
  const end = parseDateOnly(endIso);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function frequencyLabel(frequency, intervalDays) {
  const key = String(frequency || "").trim().toLowerCase();
  const days = Number(intervalDays) || 0;
  if (key === "daily") return "Daily";
  if (key === "weekly") return "Weekly";
  if (key === "every_15_days") return "Every 15 days";
  if (key === "monthly") return "Monthly";
  if (key === "custom") {
    if (days === 1) return "Every day";
    if (days > 1) return `Every ${days} days`;
  }
  return "";
}

function normalizeFrequency(frequency, customIntervalDays) {
  const key = String(frequency || "").trim().toLowerCase();
  if (!FREQUENCIES.has(key)) {
    throw validationError("frequency must be daily, weekly, every 15 days, monthly, or custom");
  }
  if (key === "custom") {
    const days = Math.floor(Number(customIntervalDays));
    if (!Number.isFinite(days) || days < 1 || days > 365) {
      throw validationError("Custom interval must be between 1 and 365 days");
    }
    return { frequency: "custom", intervalDays: days };
  }
  return { frequency: key, intervalDays: FREQUENCY_INTERVALS[key] };
}

function buildSchedulePeriods(timings, quantity, beforeFirstMeal) {
  if (!Array.isArray(timings) || timings.length === 0) {
    throw validationError("At least one timing is required");
  }
  const qty = Math.floor(Number(quantity));
  if (!Number.isFinite(qty) || qty <= 0) {
    throw validationError("quantity must be greater than 0");
  }
  const seen = new Set();
  const periods = [];
  for (const raw of timings) {
    const timing = String(raw || "").trim().toLowerCase();
    if (!WC_TIMING_SET.has(timing)) {
      throw validationError("Timing must be morning, evening, or night");
    }
    if (seen.has(timing)) {
      throw validationError("The same timing cannot be selected twice");
    }
    seen.add(timing);
    periods.push({
      period: timing,
      quantity: qty,
      mealRelation: beforeFirstMeal ? "before" : "after",
    });
  }
  periods.sort((a, b) => periodSortIndex(a.period) - periodSortIndex(b.period));
  return periods;
}

function isDosagePublished(dosage) {
  return dosage?.publishedToApp !== false;
}

function isScheduledCalendarDay(dosage, logDate) {
  const date = asDateOnly(logDate);
  const start = asDateOnly(dosage?.startDate);
  if (!date || !start || date < start) return false;
  const interval = Number(dosage?.intervalDays);
  if (Number.isFinite(interval) && interval >= 1) {
    const diff = daysBetweenIso(start, date);
    return diff != null && diff >= 0 && diff % interval === 0;
  }
  const end = asDateOnly(dosage?.endDate);
  if (end && date > end) return false;
  return true;
}

function isDosageScheduledOnDate(dosage, logDate) {
  if (!dosage) return false;
  if (String(dosage.status || "").toLowerCase() === "stopped") return false;
  if (!isDosagePublished(dosage)) return false;
  return isScheduledCalendarDay(dosage, logDate);
}

function countElapsedScheduledDays(dosage, throughDate) {
  const start = asDateOnly(dosage?.startDate);
  const through = asDateOnly(throughDate) || todayDateOnly();
  if (!start || through < start) return 0;
  const interval = Number(dosage?.intervalDays);
  const end = asDateOnly(dosage?.endDate);
  const last = end && end < through ? end : through;
  if (last < start) return 0;
  if (Number.isFinite(interval) && interval >= 1) {
    const diff = daysBetweenIso(start, last);
    if (diff == null || diff < 0) return 0;
    return Math.floor(diff / interval) + 1;
  }
  const diff = daysBetweenIso(start, last);
  if (diff == null || diff < 0) return 0;
  return diff + 1;
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

const DOSAGE_UNITS = ["No", "Gr", "Ml", "Grams"];

function normalizeDosageUnit(value, fallback = "") {
  const raw = String(value ?? "").trim();
  if (!raw) {
    const fb = String(fallback || "").trim();
    if (!fb) {
      const err = new Error("unit is required");
      err.name = "ValidationError";
      throw err;
    }
    return fb;
  }
  const match = DOSAGE_UNITS.find((unit) => unit.toLowerCase() === raw.toLowerCase());
  if (!match) {
    const err = new Error("unit must be No, Grams, Gr, or Ml");
    err.name = "ValidationError";
    throw err;
  }
  if (match === "No") return packUnit(fallback) || "No";
  return match;
}

function packUnit(value) {
  return String(value || "").trim();
}

const SCHEDULE_DOSAGE_UNITS = ["Cap", "Tab", "Mg", "Softgles", "Sachets", "Grms"];

function normalizeScheduleUnit(value) {
  const raw = String(value ?? "").trim();
  if (!raw) throw validationError("unit is required");
  const match = SCHEDULE_DOSAGE_UNITS.find((unit) => unit.toLowerCase() === raw.toLowerCase());
  if (match) return match;
  const lower = raw.toLowerCase();
  if (lower === "no" || lower === "number" || lower === "nos") return "Cap";
  if (["grams", "gram", "grms", "g"].includes(lower)) return "Grms";
  throw validationError(`unit must be one of ${SCHEDULE_DOSAGE_UNITS.join(", ")}`);
}

function normalizePositiveQuantity(value, label) {
  const qty = Math.floor(Number(value));
  if (!Number.isFinite(qty) || qty <= 0) {
    throw validationError(`${label} must be greater than 0`);
  }
  return qty;
}

function formatDosageAmount(quantity, unit) {
  const qty = Number(quantity) || 0;
  const label = String(unit || "").trim();
  if (label === "Gr" || label === "Ml") return `${qty}${label}`;
  return `${qty} ${label}`.trim();
}

async function resolveDosageDisplayUnit(dosage) {
  const unit = String(dosage?.unit || "").trim();
  if (unit === "Gr" || unit === "Ml" || unit === "Grams") return unit;
  if (unit && unit.toLowerCase() === "no") return "No";
  if (unit && unit.toLowerCase() !== "no") return unit;
  const { getSupplementById } = require("./supplementModel");
  const supplement = dosage?.supplementId ? await getSupplementById(dosage.supplementId) : null;
  return packUnit(supplement?.unit) || unit || "No";
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
    totalQuantity: Number(row.totalQuantity) || 0,
    dailyQuantity: Number(row.dailyQuantity)
      || Number((Array.isArray(row.periods) ? row.periods : [])[0]?.quantity)
      || 0,
    totalPerDay: Number(row.totalPerDay) || 0,
    durationDays: Number(row.durationDays) || 0,
    startDate: row.startDate,
    endDate: row.endDate || "",
    frequency: String(row.frequency || "").trim(),
    intervalDays: Number(row.intervalDays) || 0,
    beforeFirstMeal: row.beforeFirstMeal === true,
    publishedToApp: row.publishedToApp !== false,
    frequencyLabel: frequencyLabel(row.frequency, row.intervalDays),
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

async function findActiveDosageBySupplement(userId, supplementId, exceptDosageId = "") {
  const sid = String(supplementId || "").trim();
  const skip = String(exceptDosageId || "").trim();
  if (!sid) return null;
  const rows = await listUserSupplementDosagesByUserId(userId, { includeStopped: false });
  return rows.find((row) => row.supplementId === sid && row.id !== skip && row.status !== "stopped") || null;
}

async function createScheduledUserSupplementDosage({
  userId,
  coachId,
  supplementId,
  name,
  unit,
  startDate,
  periods,
  totalQuantity,
  dailyQuantity,
  frequency,
  intervalDays,
  beforeFirstMeal = false,
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

  const duplicate = await findActiveDosageBySupplement(uid, sid);
  if (duplicate) {
    throw validationError("This nutrition already has an active dosage");
  }

  const normalizedDaily = normalizePositiveQuantity(
    dailyQuantity ?? periods?.[0]?.quantity,
    "Daily qty"
  );
  const normalizedTotal = normalizePositiveQuantity(totalQuantity, "Total qty");
  if (normalizedTotal < normalizedDaily) {
    throw validationError("Total qty must be greater than or equal to Daily qty");
  }

  const normalizedPeriods = normalizePeriods(
    (periods || []).map((row) => ({ ...row, quantity: normalizedDaily }))
  );
  const normalizedStart = normalizeStartDate(startDate);
  const schedule = normalizeFrequency(frequency, intervalDays);
  const totalPerDay = normalizedPeriods.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  if (normalizedTotal < totalPerDay) {
    throw validationError("Total qty must cover at least one full dose day");
  }
  const now = new Date().toISOString();

  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    supplementId: sid,
    name: String(name || "").trim(),
    unit: String(unit || "").trim(),
    packSize: 0,
    periods: normalizedPeriods,
    totalQuantity: normalizedTotal,
    dailyQuantity: normalizedDaily,
    totalPerDay,
    durationDays: 0,
    startDate: normalizedStart,
    frequency: schedule.frequency,
    intervalDays: schedule.intervalDays,
    beforeFirstMeal: beforeFirstMeal === true,
    publishedToApp: false,
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

async function updateScheduledUserSupplementDosage(id, {
  supplementId,
  name,
  unit,
  startDate,
  periods,
  totalQuantity,
  dailyQuantity,
  frequency,
  intervalDays,
  beforeFirstMeal = false,
}) {
  const record = await getUserSupplementDosageRecordById(id);
  if (!record) {
    const err = new Error("Dosage plan not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (String(record.status || "").toLowerCase() === "stopped") {
    throw validationError("Stopped dosages cannot be edited");
  }

  const sid = String(supplementId || "").trim();
  if (!sid) throw validationError("supplementId is required");
  const duplicate = await findActiveDosageBySupplement(record.userId, sid, id);
  if (duplicate) {
    throw validationError("This nutrition already has an active dosage");
  }

  const normalizedDaily = normalizePositiveQuantity(
    dailyQuantity ?? periods?.[0]?.quantity,
    "Daily qty"
  );
  const normalizedTotal = normalizePositiveQuantity(totalQuantity, "Total qty");
  if (normalizedTotal < normalizedDaily) {
    throw validationError("Total qty must be greater than or equal to Daily qty");
  }

  const normalizedPeriods = normalizePeriods(
    (periods || []).map((row) => ({ ...row, quantity: normalizedDaily }))
  );
  const normalizedStart = normalizeStartDate(startDate);
  const schedule = normalizeFrequency(frequency, intervalDays);
  const totalPerDay = normalizedPeriods.reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
  if (normalizedTotal < totalPerDay) {
    throw validationError("Total qty must cover at least one full dose day");
  }
  const now = new Date().toISOString();

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET supplementId = :supplementId, #name = :name, #unit = :unit, periods = :periods, totalQuantity = :totalQuantity, dailyQuantity = :dailyQuantity, totalPerDay = :totalPerDay, durationDays = :durationDays, startDate = :startDate, frequency = :frequency, intervalDays = :intervalDays, beforeFirstMeal = :beforeFirstMeal, updatedAt = :updatedAt REMOVE endDate",
      ExpressionAttributeNames: {
        "#name": "name",
        "#unit": "unit",
      },
      ExpressionAttributeValues: {
        ":supplementId": sid,
        ":name": String(name || "").trim(),
        ":unit": String(unit || "").trim(),
        ":periods": normalizedPeriods,
        ":totalQuantity": normalizedTotal,
        ":dailyQuantity": normalizedDaily,
        ":totalPerDay": totalPerDay,
        ":durationDays": 0,
        ":startDate": normalizedStart,
        ":frequency": schedule.frequency,
        ":intervalDays": schedule.intervalDays,
        ":beforeFirstMeal": beforeFirstMeal === true,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toUserSupplementDosagePublic(Attributes);
}

async function publishUserSupplementDosage(id) {
  const record = await getUserSupplementDosageRecordById(id);
  if (!record) {
    const err = new Error("Dosage plan not found");
    err.name = "NotFoundError";
    throw err;
  }
  if (String(record.status || "").toLowerCase() === "stopped") {
    throw validationError("Stopped dosages cannot be pushed to the app");
  }
  if (record.publishedToApp === true) {
    return toUserSupplementDosagePublic(record);
  }

  const now = new Date().toISOString();
  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: "SET publishedToApp = :publishedToApp, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":publishedToApp": true,
        ":updatedAt": now,
      },
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toUserSupplementDosagePublic(Attributes);
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

/** Atomically claim the 90% near-complete alert so it fires once per dosage. */
async function markDosageNearCompleteNotified(id) {
  const dosageId = String(id || "").trim();
  if (!dosageId) return false;
  const now = new Date().toISOString();
  try {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: dosageId },
        UpdateExpression: "SET nearCompleteNotifiedAt = :at, updatedAt = :at",
        ConditionExpression:
          "attribute_exists(id) AND attribute_not_exists(nearCompleteNotifiedAt)",
        ExpressionAttributeValues: { ":at": now },
      })
    );
    return true;
  } catch (err) {
    if (err?.name === "ConditionalCheckFailedException") return false;
    throw err;
  }
}

module.exports = {
  PERIODS,
  PERIOD_ORDER,
  DAY_PARTS,
  DAY_PART_SET,
  WC_TIMINGS,
  MEAL_TIMINGS,
  MEAL_TIMING_SET,
  COMPOSITE_PERIOD_SEP,
  MAX_PERIODS,
  MEAL_RELATIONS,
  createUserSupplementDosage,
  createScheduledUserSupplementDosage,
  updateScheduledUserSupplementDosage,
  publishUserSupplementDosage,
  findActiveDosageBySupplement,
  getUserSupplementDosageById,
  getUserSupplementDosageRecordById,
  listUserSupplementDosagesByUserId,
  stopUserSupplementDosage,
  markDosageNearCompleteNotified,
  toUserSupplementDosagePublic,
  DOSAGE_UNITS,
  normalizeDosageUnit,
  normalizeScheduleUnit,
  normalizePositiveQuantity,
  formatDosageAmount,
  resolveDosageDisplayUnit,
  normalizePeriods,
  normalizeStartDate,
  computeDosageMetrics,
  addDaysToDate,
  normalizeCreatedByRole,
  parseCompositePeriod,
  composePeriod,
  isValidPeriod,
  normalizeFrequency,
  buildSchedulePeriods,
  frequencyLabel,
  isDosagePublished,
  isScheduledCalendarDay,
  isDosageScheduledOnDate,
  countElapsedScheduledDays,
  periodSortIndex,
  defaultMealRelationForPeriod,
};
