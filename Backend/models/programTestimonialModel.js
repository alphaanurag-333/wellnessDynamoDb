const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");
const {
  normalizeMediaItemFromStorage,
  legacyFieldsToRemoveOnUpdate,
  normalizeUpdateFieldName,
} = require("../utils/mediaFieldAliases");
const {
  listByPartitionKey,
  buildContainsFilter,
} = require("../utils/dynamoList");
const { typesEquivalent } = require("../utils/programTestimonialType");

const TABLE = "ProgramTestimonials";
const STATUS = new Set(["active", "inactive"]);
const TYPES = new Set([
  "diabetes_reversal",
  "pcod_pcos_reversal",
  "thyroid_care",
  "gut_health",
]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

const TYPE_LABELS = {
  diabetes_reversal: "Diabetes Reversal",
  pcod_pcos_reversal: "PCOD / PCOS Reversal",
  thyroid_care: "Thyroid Care",
  gut_health: "Gut Health",
};

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function sortProgramTestimonialsByOrder(a, b) {
  const orderA = normalizeSortOrder(a?.sortOrder, 9999);
  const orderB = normalizeSortOrder(b?.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(b?.createdAt || "").localeCompare(String(a?.createdAt || ""));
}

function normalizeType(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    throw new Error("type is required");
  }
  // Prefer slug form (health-concern titles); keep uuid-like ids intact.
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    return raw;
  }
  const next = raw
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!next || next.length > 120) {
    throw new Error("type is required");
  }
  return next;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. program-testimonials/photo.jpg)");
  }
  return objectKey;
}

function toPublicProgramTestimonial(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  if (!row) return null;
  if (row.profileImage) row.profileImage = resolvePublicUrl(row.profileImage);
  if (row.type) row.typeLabel = TYPE_LABELS[row.type] || row.type;
  return row;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "profileImage") return normalizeProfileImageField(value);
  if (["name", "description"].includes(field)) return String(value).trim();
  if (field === "type") return normalizeType(value);
  if (field === "status") return normalizeStatus(value);
  if (field === "sortOrder") return normalizeSortOrder(value);
  return value;
}

async function listAllProgramTestimonialsUnpaged() {
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: undefined,
    scanIndexForward: false,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortProgramTestimonialsByOrder,
  });
  return result.items || [];
}

async function nextSortOrder() {
  const items = await listAllProgramTestimonialsUnpaged();
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => {
    const order = normalizeSortOrder(item.sortOrder, 0);
    return order > acc ? order : acc;
  }, 0);
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createProgramTestimonial({
  name,
  description,
  profileImage,
  profile_image,
  type,
  status = "active",
  sortOrder,
}) {
  const now = new Date().toISOString();
  const imageKey = normalizeProfileImageField(profileImage ?? profile_image);
  const resolvedOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? await nextSortOrder()
      : normalizeSortOrder(sortOrder);
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    description: String(description || "").trim(),
    profileImage: imageKey,
    type: normalizeType(type),
    status: normalizeStatus(status),
    sortOrder: resolvedOrder,
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
  return toPublicProgramTestimonial(item);
}

async function getProgramTestimonialRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getProgramTestimonialById(id) {
  const item = await getProgramTestimonialRecordById(id);
  return item ? toPublicProgramTestimonial(item) : null;
}

async function updateProgramTestimonial(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [normalizeUpdateFieldName(k), sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
  }

  const removeFields = legacyFieldsToRemoveOnUpdate(Object.fromEntries(entries));
  let updateExpression = setExpr;
  if (removeFields.length > 0) {
    updateExpression += ` REMOVE ${removeFields.join(", ")}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );
  return toPublicProgramTestimonial(Attributes || null);
}

async function deleteProgramTestimonial(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listProgramTestimonials({ page = 1, limit = 10, status, type, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  let normalizedType = "";
  if (type) {
    try {
      normalizedType = normalizeType(type);
    } catch {
      return {
        programTestimonials: [],
        pagination: { page: 1, limit, total: 0, pages: 1 },
      };
    }
  }

  const searchFilter = buildContainsFilter(["name", "description"], search);
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 10));

  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: { ...searchFilter.exprNames },
    exprValues: { ...searchFilter.exprValues },
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortProgramTestimonialsByOrder,
  });

  const matched = normalizedType
    ? items.filter((row) => typesEquivalent(row?.type, normalizedType))
    : items;
  const total = matched.length;
  const start = (safePage - 1) * safeLimit;
  const paged = matched.slice(start, start + safeLimit);

  return {
    programTestimonials: paged.map((row) => toPublicProgramTestimonial(row)),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages: Math.max(1, Math.ceil(total / safeLimit)),
    },
  };
}

/**
 * Persist display order. `orderedIds` is the full list in desired order (1-based sortOrder).
 */
async function reorderProgramTestimonials(orderedIds = []) {
  const ids = Array.isArray(orderedIds)
    ? orderedIds.map((id) => String(id || "").trim()).filter(Boolean)
    : [];

  if (!ids.length) {
    throw new Error("orderedIds is required");
  }

  const unique = new Set(ids);
  if (unique.size !== ids.length) {
    throw new Error("orderedIds must be unique");
  }

  const existing = await listAllProgramTestimonialsUnpaged();
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const id of ids) {
    if (!byId.has(id)) {
      const err = new Error(`Program testimonial not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
  }

  const updated = await Promise.all(
    ids.map((id, index) => updateProgramTestimonial(id, { sortOrder: index + 1 })),
  );

  return updated.sort(sortProgramTestimonialsByOrder);
}

module.exports = {
  TABLE,
  TYPES,
  TYPE_LABELS,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  normalizeStatus,
  normalizeType,
  normalizeSortOrder,
  typesEquivalent,
  createProgramTestimonial,
  getProgramTestimonialById,
  getProgramTestimonialRecordById,
  updateProgramTestimonial,
  deleteProgramTestimonial,
  listProgramTestimonials,
  reorderProgramTestimonials,
};
