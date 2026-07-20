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
  paginateItems,
} = require("../utils/dynamoList");

const TABLE = "ClientTestimonials";
const STATUS = new Set(["active", "inactive"]);
const NAME_MAX = 35;
const DESCRIPTION_MAX = 255;

function normalizeStatus(value, fallback = "inactive") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. client-testimonials/photo.jpg)");
  }
  return objectKey;
}

function sanitizeName(value) {
  const name = String(value || "").trim();
  if (!name) throw new Error("name is required");
  if (name.length > NAME_MAX) throw new Error(`name cannot exceed ${NAME_MAX} characters`);
  return name;
}

function sanitizeDescription(value) {
  const description = String(value || "").trim();
  if (!description) throw new Error("description is required");
  if (description.length > DESCRIPTION_MAX) {
    throw new Error(`description cannot exceed ${DESCRIPTION_MAX} characters`);
  }
  return description;
}

function sanitizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new Error("rating must be a number between 1 and 5");
  }
  return Math.round(rating);
}

function toPublicClientTestimonial(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  if (!row) return null;
  if (row.profileImage) row.profileImage = resolvePublicUrl(row.profileImage);
  row.status = normalizeStatus(row.status, "inactive");
  return row;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "profileImage") return normalizeProfileImageField(value);
  if (field === "name") return sanitizeName(value);
  if (field === "description") return sanitizeDescription(value);
  if (field === "rating") return sanitizeRating(value);
  if (field === "status") return normalizeStatus(value);
  if (field === "userId") return String(value || "").trim();
  if (field === "managedByCoachId") return value ? String(value).trim() : null;
  if (field === "assignedCoachType") return value ? String(value).trim() : null;
  if (field === "assignedCoachId") return value ? String(value).trim() : null;
  if (field === "submittedByRole") return String(value || "").trim();
  return value;
}

async function createClientTestimonial({
  name,
  rating,
  description,
  profileImage,
  profile_image,
  status = "inactive",
  userId,
  managedByCoachId,
  assignedCoachType,
  assignedCoachId,
  submittedByRole = "user",
}) {
  const now = new Date().toISOString();
  const imageRaw = profileImage ?? profile_image;
  const imageKey = imageRaw ? normalizeProfileImageField(imageRaw) : "";

  const item = {
    id: uuidv4(),
    name: sanitizeName(name),
    rating: sanitizeRating(rating),
    description: sanitizeDescription(description),
    profileImage: imageKey,
    status: normalizeStatus(status, "inactive"),
    userId: String(userId || "").trim() || undefined,
    managedByCoachId: managedByCoachId ? String(managedByCoachId).trim() : undefined,
    assignedCoachType: assignedCoachType ? String(assignedCoachType).trim() : undefined,
    assignedCoachId: assignedCoachId ? String(assignedCoachId).trim() : undefined,
    submittedByRole: String(submittedByRole || "user").trim(),
    createdAt: now,
    updatedAt: now,
  };

  if (!item.userId) delete item.userId;
  if (!item.managedByCoachId) delete item.managedByCoachId;
  if (!item.assignedCoachType) delete item.assignedCoachType;
  if (!item.assignedCoachId) delete item.assignedCoachId;
  if (!item.profileImage) delete item.profileImage;

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return toPublicClientTestimonial(item);
}

async function getClientTestimonialRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getClientTestimonialById(id) {
  const item = await getClientTestimonialRecordById(id);
  return item ? toPublicClientTestimonial(item) : null;
}

async function updateClientTestimonial(id, updates) {
  const blockedFields = new Set([
    "id",
    "_id",
    "createdAt",
    "userId",
    "submittedByRole",
    "name",
    "profileImage",
  ]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && !blockedFields.has(normalizeUpdateFieldName(k)) && v !== undefined)
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
  return toPublicClientTestimonial(Attributes || null);
}

async function deleteClientTestimonial(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

/** Returns the user's single review if present (newest first). */
async function getClientTestimonialByUserId(userId) {
  const normalizedUserId = String(userId || "").trim();
  if (!normalizedUserId) return null;
  const data = await listClientTestimonials({
    page: 1,
    limit: 1,
    userId: normalizedUserId,
  });
  return data.clientTestimonials[0] || null;
}

async function listClientTestimonials({
  page = 1,
  limit = 10,
  status,
  search,
  userId,
  managedByCoachId,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedUserId = String(userId || "").trim();
  const normalizedCoachId = String(managedByCoachId || "").trim();
  const searchFilter = buildContainsFilter(["name", "description"], search);

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedUserId) {
    exprNames["#userId"] = "userId";
    exprValues[":userId"] = normalizedUserId;
    filterExpression = appendFilter(filterExpression, "#userId = :userId");
  }

  if (normalizedCoachId) {
    exprNames["#managedByCoachId"] = "managedByCoachId";
    exprValues[":managedByCoachId"] = normalizedCoachId;
    filterExpression = appendFilter(filterExpression, "#managedByCoachId = :managedByCoachId");
  }

  const usePostFilter = Boolean(normalizedUserId || normalizedCoachId || searchFilter.search);
  const queryPage = usePostFilter ? 1 : page;
  const queryLimit = usePostFilter ? Number.MAX_SAFE_INTEGER : limit;
  const queryMaxLimit = usePostFilter ? Number.MAX_SAFE_INTEGER : 200;

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page: queryPage,
    limit: queryLimit,
    maxLimit: queryMaxLimit,
    sortFn: sortByCreatedAtDesc,
  });

  const mapped = items.map((row) => toPublicClientTestimonial(row));

  if (usePostFilter) {
    const paged = paginateItems(mapped, page, limit, 200);
    return {
      clientTestimonials: paged.items,
      pagination: paged.pagination,
    };
  }

  return {
    clientTestimonials: mapped,
    pagination,
  };
}

module.exports = {
  TABLE,
  normalizeStatus,
  createClientTestimonial,
  getClientTestimonialById,
  getClientTestimonialRecordById,
  getClientTestimonialByUserId,
  updateClientTestimonial,
  deleteClientTestimonial,
  listClientTestimonials,
};
