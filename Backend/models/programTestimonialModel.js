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
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "ProgramTestimonials";
const STATUS = new Set(["active", "inactive"]);
const TYPES = new Set([
  "diabetes_reversal",
  "pcod_pcos_reversal",
  "thyroid_care",
  "gut_health",
]);

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

function normalizeType(value) {
  const next = String(value || "").toLowerCase().trim();
  if (!TYPES.has(next)) {
    throw new Error(
      `type must be one of: ${[...TYPES].join(", ")}`
    );
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
  return value;
}

async function createProgramTestimonial({
  name,
  description,
  profileImage,
  profile_image,
  type,
  status = "active",
}) {
  const now = new Date().toISOString();
  const imageKey = normalizeProfileImageField(profileImage ?? profile_image);
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    description: String(description || "").trim(),
    profileImage: imageKey,
    type: normalizeType(type),
    status: normalizeStatus(status),
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

  let indexName = "StatusCreatedAtIndex";
  let partitionKeyName = "status";
  let partitionKeyValue = normalizedStatus || undefined;
  let exprNames = { ...searchFilter.exprNames };
  let exprValues = { ...searchFilter.exprValues };
  let filterExpression = searchFilter.filterExpression;

  if (normalizedType) {
    indexName = "TypeCreatedAtIndex";
    partitionKeyName = "type";
    partitionKeyValue = normalizedType;
    if (normalizedStatus) {
      exprNames["#status"] = "status";
      exprValues[":status"] = normalizedStatus;
      filterExpression = appendFilter(filterExpression, "#status = :status");
    }
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName,
    partitionKeyName,
    partitionKeyValue,
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
    programTestimonials: items.map((row) => toPublicProgramTestimonial(row)),
    pagination,
  };
}

module.exports = {
  TABLE,
  TYPES,
  TYPE_LABELS,
  normalizeStatus,
  normalizeType,
  createProgramTestimonial,
  getProgramTestimonialById,
  getProgramTestimonialRecordById,
  updateProgramTestimonial,
  deleteProgramTestimonial,
  listProgramTestimonials,
};
