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
  sortByCreatedAtDesc,
  paginateItems,
} = require("../utils/dynamoList");
const {
  enrichRealPeopleTestimonial,
  enrichRealPeopleTestimonials,
} = require("../services/realPeopleTestimonialEnrichment");

const TABLE = "RealPeopleTestimonial";
const STATUS = new Set(["active", "inactive"]);
const NAME_MAX = 35;
const REVIEW_MIN = 3;
const REVIEW_MAX = 500;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeName(value) {
  const name = String(value || "").trim();
  if (!name) throw new Error("name is required");
  if (name.length > NAME_MAX) throw new Error(`name cannot exceed ${NAME_MAX} characters`);
  return name;
}

function sanitizeStars(value) {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars < 1 || stars > 5) {
    throw new Error("stars must be a number between 1 and 5");
  }
  return Math.round(stars);
}

function sanitizeReview(value) {
  const review = String(value || "").trim();
  if (!review) throw new Error("review is required");
  if (review.length < REVIEW_MIN) throw new Error(`review must be at least ${REVIEW_MIN} characters`);
  if (review.length > REVIEW_MAX) throw new Error(`review cannot exceed ${REVIEW_MAX} characters`);
  return review;
}

function sanitizeHealthConcernId(value) {
  const id = String(value || "").trim();
  if (!id) throw new Error("healthConcernId is required");
  return id;
}

function normalizeProfileImageField(value) {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("profileImage must be a valid S3 object key (e.g. real-people-testimonials/photo.jpg)");
  }
  return objectKey;
}

function toPublicRealPeopleTestimonial(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  if (!row) return null;
  if (row.profileImage) row.profileImage = resolvePublicUrl(row.profileImage);
  row.stars = row.stars ?? row.rating ?? null;
  row.rating = row.stars;
  row.review = String(row.review ?? row.content ?? "").trim();
  row.content = row.review;
  return row;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "profileImage") return normalizeProfileImageField(value);
  if (field === "name") return sanitizeName(value);
  if (field === "review" || field === "content") return sanitizeReview(value);
  if (field === "stars" || field === "rating") return sanitizeStars(value);
  if (field === "healthConcernId") return sanitizeHealthConcernId(value);
  if (field === "status") return normalizeStatus(value);
  return value;
}

async function createRealPeopleTestimonial({
  name,
  stars,
  rating,
  review,
  content,
  profileImage,
  profile_image,
  healthConcernId,
  status = "active",
}) {
  const now = new Date().toISOString();
  const imageKey = normalizeProfileImageField(profileImage ?? profile_image);
  if (!imageKey) throw new Error("profileImage is required");

  const item = {
    id: uuidv4(),
    name: sanitizeName(name),
    stars: sanitizeStars(stars ?? rating),
    review: sanitizeReview(review ?? content),
    profileImage: imageKey,
    healthConcernId: sanitizeHealthConcernId(healthConcernId),
    status: normalizeStatus(status, "active"),
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

  return enrichRealPeopleTestimonial(toPublicRealPeopleTestimonial(item));
}

async function getRealPeopleTestimonialRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getRealPeopleTestimonialById(id) {
  const item = await getRealPeopleTestimonialRecordById(id);
  if (!item) return null;
  return enrichRealPeopleTestimonial(toPublicRealPeopleTestimonial(item));
}

async function updateRealPeopleTestimonial(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => {
      const field =
        normalizeUpdateFieldName(k) === "content"
          ? "review"
          : normalizeUpdateFieldName(k) === "rating"
            ? "stars"
            : normalizeUpdateFieldName(k);
      return [field, sanitizeUpdateField(k, v)];
    });

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

  return enrichRealPeopleTestimonial(toPublicRealPeopleTestimonial(Attributes || null));
}

async function deleteRealPeopleTestimonial(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

function matchesHealthConcern(row, healthConcernId) {
  const target = String(healthConcernId || "").trim();
  if (!target) return true;
  return [
    row?.healthConcernId,
    row?.healthConcern?.id,
  ].some((value) => String(value || "").trim() === target);
}

async function listRealPeopleTestimonials({
  page = 1,
  limit = 10,
  status,
  search,
  healthConcernId,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedHealthConcernId = String(healthConcernId || "").trim();
  const searchFilter = buildContainsFilter(["name", "review"], search);
  const useHealthConcernFilter = Boolean(normalizedHealthConcernId);
  const queryPage = useHealthConcernFilter || searchFilter.search ? 1 : page;
  const queryLimit =
    useHealthConcernFilter || searchFilter.search ? Number.MAX_SAFE_INTEGER : limit;
  const queryMaxLimit =
    useHealthConcernFilter || searchFilter.search ? Number.MAX_SAFE_INTEGER : 200;

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page: queryPage,
    limit: queryLimit,
    maxLimit: queryMaxLimit,
    sortFn: sortByCreatedAtDesc,
  });

  let realPeopleTestimonials = await enrichRealPeopleTestimonials(
    items.map((row) => toPublicRealPeopleTestimonial(row))
  );

  if (useHealthConcernFilter) {
    realPeopleTestimonials = realPeopleTestimonials.filter((row) =>
      matchesHealthConcern(row, normalizedHealthConcernId)
    );
    const paged = paginateItems(realPeopleTestimonials, page, limit, 200);
    return {
      realPeopleTestimonials: paged.items,
      pagination: paged.pagination,
    };
  }

  return {
    realPeopleTestimonials,
    pagination,
  };
}

module.exports = {
  TABLE,
  normalizeStatus,
  createRealPeopleTestimonial,
  getRealPeopleTestimonialById,
  getRealPeopleTestimonialRecordById,
  updateRealPeopleTestimonial,
  deleteRealPeopleTestimonial,
  listRealPeopleTestimonials,
};
