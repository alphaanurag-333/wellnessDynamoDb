const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");
const {
  todayDateOnly,
  listDateRange,
  dayLabel,
  isValidDateOnly,
  addDaysDateOnly,
} = require("../utils/dateOnly");

const TABLE = "MealTracking";

const VALID_CATEGORIES = new Set([
  "functional_juice",
  "salad",
  "meal",
  "beverage",
  "snacks",
  "protein",
]);

const LOGGED_BY_ROLES = new Set([
  "wellness_coach",
  "assistant_wellness_coach",
  "user",
]);

function normalizeCategory(value) {
  const cat = String(value || "meal").trim().toLowerCase();
  if (!VALID_CATEGORIES.has(cat)) {
    const err = new Error(
      `category must be one of: ${[...VALID_CATEGORIES].join(", ")}`
    );
    err.name = "ValidationError";
    throw err;
  }
  return cat;
}

function normalizeLoggedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return LOGGED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeMealType(value) {
  if (value === undefined || value === null) return "First";
  const t = String(value).trim();
  if (!t) return "First";
  if (t.length > 60) {
    const err = new Error("mealType cannot exceed 60 characters");
    err.name = "ValidationError";
    throw err;
  }
  return t;
}

function normalizeEntryTime(value) {
  if (!value) return null;
  const t = String(value).trim();
  if (!/^\d{2}:\d{2}$/.test(t)) {
    const err = new Error("entryTime must be in HH:MM format");
    err.name = "ValidationError";
    throw err;
  }
  return t;
}

function normalizeDescription(value) {
  if (value === undefined || value === null) return null;
  const d = String(value).trim();
  if (!d) return null;
  if (d.length > 1000) {
    const err = new Error("description cannot exceed 1000 characters");
    err.name = "ValidationError";
    throw err;
  }
  return d;
}

function normalizeMacro(value, fieldName) {
  if (value === undefined || value === null) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    const err = new Error(`${fieldName} must be a non-negative number`);
    err.name = "ValidationError";
    throw err;
  }
  return Math.round(n * 100) / 100;
}

function normalizeItems(value) {
  if (!value) return [];
  let arr;
  if (typeof value === "string") {
    try {
      arr = JSON.parse(value);
    } catch {
      const err = new Error("items must be a valid JSON array");
      err.name = "ValidationError";
      throw err;
    }
  } else {
    arr = value;
  }
  if (!Array.isArray(arr)) {
    const err = new Error("items must be an array");
    err.name = "ValidationError";
    throw err;
  }
  if (arr.length > 50) {
    const err = new Error("items cannot exceed 50 entries");
    err.name = "ValidationError";
    throw err;
  }
  return arr.map((item, i) => {
    const name = String(item?.name || "").trim();
    if (!name) {
      const err = new Error(`items[${i}].name is required`);
      err.name = "ValidationError";
      throw err;
    }
    const quantityGm = item?.quantityGm != null ? Number(item.quantityGm) : 0;
    if (!Number.isFinite(quantityGm) || quantityGm < 0) {
      const err = new Error(`items[${i}].quantityGm must be a non-negative number`);
      err.name = "ValidationError";
      throw err;
    }
    return { name, quantityGm: Math.round(quantityGm * 100) / 100 };
  });
}

function toMealLogPublic(item) {
  if (!item) return null;
  return {
    id: item.id,
    _id: item.id,
    userId: item.userId,
    date: item.date,
    entryTime: item.entryTime ?? null,
    category: item.category,
    mealType: item.mealType ?? "First",
    description: item.description ?? null,
    items: item.items ?? [],
    photoKey: item.photoKey ?? null,
    photoUrl: item.photoKey ? resolvePublicUrl(item.photoKey) : null,
    proteinGm: Number(item.proteinGm ?? 0),
    fatsGm: Number(item.fatsGm ?? 0),
    carbsGm: Number(item.carbsGm ?? 0),
    caloriesKcal: Number(item.caloriesKcal ?? 0),
    loggedByRole: item.loggedByRole ?? "wellness_coach",
    loggedById: item.loggedById ?? null,
    coachId: item.coachId ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

async function createMealLog({
  userId,
  coachId,
  date,
  entryTime,
  category,
  mealType,
  description,
  items,
  photoKey,
  proteinGm,
  fatsGm,
  carbsGm,
  caloriesKcal,
  loggedByRole,
  loggedById,
}) {
  const uid = String(userId || "").trim();
  if (!uid) throw new Error("userId is required");

  const logDate = isValidDateOnly(date) ? date : todayDateOnly();

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    date: logDate,
    entryTime: normalizeEntryTime(entryTime),
    category: normalizeCategory(category),
    mealType: normalizeMealType(mealType),
    description: normalizeDescription(description),
    items: normalizeItems(items),
    photoKey: photoKey || null,
    proteinGm: normalizeMacro(proteinGm, "proteinGm"),
    fatsGm: normalizeMacro(fatsGm, "fatsGm"),
    carbsGm: normalizeMacro(carbsGm, "carbsGm"),
    caloriesKcal: normalizeMacro(caloriesKcal, "caloriesKcal"),
    loggedByRole: normalizeLoggedByRole(loggedByRole),
    loggedById: String(loggedById || "").trim() || null,
    coachId: coachId ? String(coachId).trim() : null,
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

  return toMealLogPublic(item);
}

async function getMealLogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function getMealLogById(id) {
  const item = await getMealLogRecordById(id);
  return item ? toMealLogPublic(item) : null;
}

async function updateMealLog(id, updates) {
  const now = new Date().toISOString();
  // Alias every attribute name with a #placeholder to avoid DynamoDB reserved
  // keyword collisions (e.g. "items", "date", "category").
  const setExprParts = ["#updatedAt = :updatedAt"];
  const exprNames = { "#updatedAt": "updatedAt" };
  const exprValues = { ":updatedAt": now };

  const addField = (field, value) => {
    setExprParts.push(`#${field} = :${field}`);
    exprNames[`#${field}`] = field;
    exprValues[`:${field}`] = value;
  };

  if (updates.date !== undefined && isValidDateOnly(updates.date)) {
    addField("date", updates.date);
  }
  if (updates.entryTime !== undefined) {
    addField("entryTime", normalizeEntryTime(updates.entryTime));
  }
  if (updates.category !== undefined) {
    addField("category", normalizeCategory(updates.category));
  }
  if (updates.mealType !== undefined) {
    addField("mealType", normalizeMealType(updates.mealType));
  }
  if (updates.description !== undefined) {
    addField("description", normalizeDescription(updates.description));
  }
  if (updates.items !== undefined) {
    addField("items", normalizeItems(updates.items));
  }
  if (updates.photoKey !== undefined) {
    addField("photoKey", updates.photoKey || null);
  }
  if (updates.proteinGm !== undefined) {
    addField("proteinGm", normalizeMacro(updates.proteinGm, "proteinGm"));
  }
  if (updates.fatsGm !== undefined) {
    addField("fatsGm", normalizeMacro(updates.fatsGm, "fatsGm"));
  }
  if (updates.carbsGm !== undefined) {
    addField("carbsGm", normalizeMacro(updates.carbsGm, "carbsGm"));
  }
  if (updates.caloriesKcal !== undefined) {
    addField("caloriesKcal", normalizeMacro(updates.caloriesKcal, "caloriesKcal"));
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: `SET ${setExprParts.join(", ")}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return Attributes ? toMealLogPublic(Attributes) : null;
}

async function deleteMealLog(id) {
  const record = await getMealLogRecordById(id);
  if (!record) {
    const err = new Error("Meal log not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (record.photoKey) {
    await deleteStoredMedia(record.photoKey);
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );

  return toMealLogPublic(record);
}

async function queryMealLogsByUserAndDateRange(userId, startDate, endDate) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserDateIndex",
        KeyConditionExpression:
          "userId = :userId AND #date BETWEEN :startDate AND :endDate",
        ExpressionAttributeNames: { "#date": "date" },
        ExpressionAttributeValues: {
          ":userId": uid,
          ":startDate": startDate,
          ":endDate": endDate,
        },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function queryMealLogsByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items = [], LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserCreatedAtIndex",
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: { ":userId": uid },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );
    items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function computeDailyMacroSummary(mealLogs, rangeDates) {
  const byDate = new Map();
  for (const log of mealLogs) {
    const d = log.date;
    if (!d) continue;
    if (!byDate.has(d)) {
      byDate.set(d, { proteinGm: 0, fatsGm: 0, carbsGm: 0, caloriesKcal: 0 });
    }
    const day = byDate.get(d);
    day.proteinGm += Number(log.proteinGm ?? 0);
    day.fatsGm += Number(log.fatsGm ?? 0);
    day.carbsGm += Number(log.carbsGm ?? 0);
    day.caloriesKcal += Number(log.caloriesKcal ?? 0);
  }

  return rangeDates.map((date) => {
    const totals = byDate.get(date) || {
      proteinGm: 0,
      fatsGm: 0,
      carbsGm: 0,
      caloriesKcal: 0,
    };
    return {
      date,
      day: dayLabel(date),
      proteinGm: Math.round(totals.proteinGm * 100) / 100,
      fatsGm: Math.round(totals.fatsGm * 100) / 100,
      carbsGm: Math.round(totals.carbsGm * 100) / 100,
      caloriesKcal: Math.round(totals.caloriesKcal * 100) / 100,
    };
  });
}

async function getUserMealSummary(userId, { date, days = 7 } = {}) {
  const targetDate = isValidDateOnly(date) ? date : todayDateOnly();
  const rangeDates = listDateRange(targetDate, days);
  const startDate = rangeDates[0];
  const endDate = rangeDates[rangeDates.length - 1];

  const rawLogs = await queryMealLogsByUserAndDateRange(userId, startDate, endDate);
  const logs = rawLogs.map(toMealLogPublic).filter(Boolean);
  const macroSummary = computeDailyMacroSummary(rawLogs, rangeDates);

  return {
    logs,
    macroSummary,
    range: { startDate, endDate, days: rangeDates.length },
  };
}

module.exports = {
  TABLE,
  VALID_CATEGORIES,
  normalizeCategory,
  normalizeMealType,
  normalizeEntryTime,
  normalizeDescription,
  normalizeMacro,
  normalizeItems,
  toMealLogPublic,
  createMealLog,
  getMealLogById,
  getMealLogRecordById,
  updateMealLog,
  deleteMealLog,
  queryMealLogsByUserId,
  queryMealLogsByUserAndDateRange,
  computeDailyMacroSummary,
  getUserMealSummary,
};
