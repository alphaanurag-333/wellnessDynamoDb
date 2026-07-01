const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "DietPlanCatalog";
const ALLOWED_STATUS = ["active", "inactive"];
const ALLOWED_TYPES = [
  "VEGETARIAN",
  "VEGAN",
  "NON_VEG",
  "KETO",
  "DIABETIC",
  "GLUTEN_FREE",
  "GENERAL",
];
const ALLOWED_SLOTS = ["breakfast", "lunch", "dinner", "snack"];
const STATUS = new Set(ALLOWED_STATUS);
const TYPES = new Set(ALLOWED_TYPES);
const SLOTS = new Set(ALLOWED_SLOTS);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "GENERAL") {
  const next = String(value || fallback).toUpperCase().trim();
  return TYPES.has(next) ? next : fallback;
}

function normalizePlanId(value) {
  const planId = slugify(value);
  if (!planId) {
    const err = new Error("planId is required");
    err.name = "ValidationError";
    throw err;
  }
  if (planId.length > 80) {
    const err = new Error("planId cannot exceed 80 characters");
    err.name = "ValidationError";
    throw err;
  }
  return planId;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  if (!name) {
    const err = new Error("name is required");
    err.name = "ValidationError";
    throw err;
  }
  if (name.length > 200) {
    const err = new Error("name cannot exceed 200 characters");
    err.name = "ValidationError";
    throw err;
  }
  return name;
}

function normalizeCategory(value) {
  const category = String(value || "").trim();
  if (!category) {
    const err = new Error("category is required");
    err.name = "ValidationError";
    throw err;
  }
  if (category.length > 100) {
    const err = new Error("category cannot exceed 100 characters");
    err.name = "ValidationError";
    throw err;
  }
  return category;
}

function normalizeDescription(value) {
  if (value === undefined || value === null) return "";
  const description = String(value).trim();
  if (description.length > 2000) {
    const err = new Error("description cannot exceed 2000 characters");
    err.name = "ValidationError";
    throw err;
  }
  return description;
}

function normalizeSequence(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
}

function normalizeMeals(meals) {
  if (!Array.isArray(meals) || meals.length === 0) {
    const err = new Error("At least one meal is required");
    err.name = "ValidationError";
    throw err;
  }

  return meals.map((meal, index) => {
    const title = String(meal?.title || "").trim();
    if (!title) {
      const err = new Error(`Meal ${index + 1}: title is required`);
      err.name = "ValidationError";
      throw err;
    }
    const mealId = normalizePlanId(meal?.mealId || title);
    const slot = String(meal?.slot || "breakfast").toLowerCase().trim();
    if (!SLOTS.has(slot)) {
      const err = new Error(`Meal ${index + 1}: slot must be breakfast, lunch, dinner, or snack`);
      err.name = "ValidationError";
      throw err;
    }
    const day = String(meal?.day || "all").trim() || "all";
    const foods = String(meal?.foods || "").trim();
    const notes = String(meal?.notes || "").trim();
    const caloriesRaw = meal?.calories;
    const calories =
      caloriesRaw === undefined || caloriesRaw === null || caloriesRaw === ""
        ? null
        : Number(caloriesRaw);
    if (calories !== null && (!Number.isFinite(calories) || calories < 0)) {
      const err = new Error(`Meal ${index + 1}: calories must be a non-negative number`);
      err.name = "ValidationError";
      throw err;
    }
    return {
      mealId,
      day,
      slot,
      title,
      foods: foods || "—",
      notes: notes || "",
      calories,
      sequence: normalizeSequence(meal?.sequence, index + 1),
    };
  });
}

function toDietPlanCatalogPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    planId: row.planId,
    name: row.name,
    type: normalizeType(row.type),
    category: row.category,
    description: row.description || "",
    status: normalizeStatus(row.status),
    meals: Array.isArray(row.meals) ? row.meals : [],
    sequence: normalizeSequence(row.sequence),
    createdBy: row.createdBy || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function snapshotPlan(item) {
  const pub = toDietPlanCatalogPublic(item);
  if (!pub) return null;
  return {
    planId: pub.planId,
    name: pub.name,
    type: pub.type,
    category: pub.category,
    description: pub.description,
    meals: pub.meals,
  };
}

async function getDietPlanCatalogByPlanId(planId) {
  const slug = normalizePlanId(planId);
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "PlanIdIndex",
      KeyConditionExpression: "#planId = :planId",
      ExpressionAttributeNames: { "#planId": "planId" },
      ExpressionAttributeValues: { ":planId": slug },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function createDietPlanCatalog({
  planId,
  name,
  type = "GENERAL",
  category,
  description = "",
  status = "active",
  meals,
  sequence = 0,
  createdBy,
}) {
  const slug = normalizePlanId(planId || name);
  const existing = await getDietPlanCatalogByPlanId(slug);
  if (existing) {
    const err = new Error("planId already exists");
    err.name = "ConflictError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    planId: slug,
    name: normalizeName(name),
    type: normalizeType(type),
    category: normalizeCategory(category),
    description: normalizeDescription(description),
    status: normalizeStatus(status),
    meals: normalizeMeals(meals),
    sequence: normalizeSequence(sequence),
    createdBy: String(createdBy || "").trim() || null,
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

  return toDietPlanCatalogPublic(item);
}

async function getDietPlanCatalogRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getDietPlanCatalogById(id) {
  const item = await getDietPlanCatalogRecordById(id);
  return item ? toDietPlanCatalogPublic(item) : null;
}

async function getActiveDietPlanCatalogByIds(ids) {
  const unique = [...new Set((ids || []).map((id) => String(id || "").trim()).filter(Boolean))];
  const results = await Promise.all(unique.map((id) => getDietPlanCatalogRecordById(id)));
  return results
    .filter((item) => item && normalizeStatus(item.status) === "active")
    .map((item) => toDietPlanCatalogPublic(item))
    .filter(Boolean);
}

async function listActiveDietPlanCatalog() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: (a, b) => {
      const seqDiff = normalizeSequence(a.sequence) - normalizeSequence(b.sequence);
      if (seqDiff !== 0) return seqDiff;
      return String(a.name || "").localeCompare(String(b.name || ""));
    },
  });
  return items.map((row) => toDietPlanCatalogPublic(row)).filter(Boolean);
}

async function listDietPlanCatalog({ page = 1, limit = 10, status, search, category, type } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name", "planId", "category", "type"], search);
  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (category) {
    const catKey = "#category";
    exprNames[catKey] = "category";
    exprValues[":category"] = String(category).trim();
    filterExpression = filterExpression
      ? `${filterExpression} AND ${catKey} = :category`
      : `${catKey} = :category`;
  }

  if (type) {
    const typeKey = "#type";
    exprNames[typeKey] = "type";
    exprValues[":type"] = normalizeType(type);
    filterExpression = filterExpression
      ? `${filterExpression} AND ${typeKey} = :type`
      : `${typeKey} = :type`;
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    plans: items.map((row) => toDietPlanCatalogPublic(row)),
    pagination,
  };
}

async function updateDietPlanCatalog(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt", "createdBy"]);
  const entries = [];

  for (const [key, value] of Object.entries(updates || {})) {
    if (blockedFields.has(key) || value === undefined) continue;
    if (key === "status") entries.push([key, normalizeStatus(value)]);
    else if (key === "type") entries.push([key, normalizeType(value)]);
    else if (key === "name") entries.push([key, normalizeName(value)]);
    else if (key === "category") entries.push([key, normalizeCategory(value)]);
    else if (key === "description") entries.push([key, normalizeDescription(value)]);
    else if (key === "sequence") entries.push([key, normalizeSequence(value)]);
    else if (key === "meals") entries.push([key, normalizeMeals(value)]);
    else if (key === "planId") entries.push([key, normalizePlanId(value)]);
    else entries.push([key, value]);
  }

  if (entries.length === 0) {
    const err = new Error("No valid fields provided for update");
    err.name = "ValidationError";
    throw err;
  }

  const planIdUpdate = entries.find(([k]) => k === "planId");
  if (planIdUpdate) {
    const existing = await getDietPlanCatalogByPlanId(planIdUpdate[1]);
    if (existing && existing.id !== id) {
      const err = new Error("planId already exists");
      err.name = "ConflictError";
      throw err;
    }
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
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

  return toDietPlanCatalogPublic(Attributes || null);
}

async function deleteDietPlanCatalog(id) {
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
  ALLOWED_TYPES,
  ALLOWED_SLOTS,
  slugify,
  normalizeStatus,
  normalizeType,
  normalizePlanId,
  normalizeMeals,
  toDietPlanCatalogPublic,
  snapshotPlan,
  createDietPlanCatalog,
  getDietPlanCatalogById,
  getDietPlanCatalogRecordById,
  getDietPlanCatalogByPlanId,
  getActiveDietPlanCatalogByIds,
  listActiveDietPlanCatalog,
  listDietPlanCatalog,
  updateDietPlanCatalog,
  deleteDietPlanCatalog,
};
