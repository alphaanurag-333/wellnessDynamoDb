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
  listByPartitionKey,
  buildContainsFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "Banner";
const STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeImageField(value, fieldName = "image") {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error(`${fieldName} must be a valid S3 object key (e.g. banner/photo.jpg)`);
  }
  return objectKey;
}

const MEDIA_FIELDS = new Set(["image", "mobileImage"]);

function toPublicBanner(banner) {
  const item = withLegacyId(banner);
  if (!item) return null;
  if (item.image) item.image = resolvePublicUrl(item.image);
  if (item.mobileImage) item.mobileImage = resolvePublicUrl(item.mobileImage);
  return item;
}

async function createBanner({ title, description, image, mobileImage = "", status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    image: normalizeImageField(image, "image"),
    mobileImage: normalizeImageField(mobileImage, "mobileImage"),
    status: normalizeStatus(status),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return toPublicBanner(item);
}

async function getBannerRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function getBannerById(id) {
  const item = await getBannerRecordById(id);
  return item ? toPublicBanner(item) : null;
}

async function updateBanner(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, v]) => v !== undefined);
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = MEDIA_FIELDS.has(k) ? normalizeImageField(v, k) : v;
    setExpr += `, #${k} = :${k}`;
  }

  const { Attributes } = await docClient.send(new UpdateCommand({
    TableName: TABLE,
    Key: { id },
    UpdateExpression: setExpr,
    ExpressionAttributeNames: exprNames,
    ExpressionAttributeValues: exprValues,
    ConditionExpression: "attribute_exists(id)",
    ReturnValues: "ALL_NEW",
  }));
  return toPublicBanner(Attributes || null);
}

async function deleteBanner(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listBanners({ page = 1, limit = 10, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["title", "description"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    banners: items.map((row) => toPublicBanner(row)),
    pagination,
  };
}

module.exports = {
  createBanner,
  getBannerById,
  getBannerRecordById,
  updateBanner,
  deleteBanner,
  listBanners,
  toPublicBanner,
};
