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
  fieldMatchesTerm,
} = require("../utils/dynamoList");

const TABLE = "Banner";
const STATUS = new Set(["active", "inactive"]);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function parseBool(value, fallback = false) {
  if (value === true || value === false) return value;
  const next = String(value ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "on"].includes(next)) return true;
  if (["false", "0", "no", "off"].includes(next)) return false;
  return fallback;
}

function normalizePlacement(value, fallback = "") {
  const next = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
  if (/^[a-z0-9_][a-z0-9_-]{0,79}$/.test(next)) return next;
  return fallback;
}

function normalizeCtaLink(value) {
  const next = String(value || "").trim();
  if (!next) return "";
  if (/^https?:\/\//i.test(next) || next.startsWith("/")) return next.slice(0, 500);
  return next.slice(0, 500);
}

function sortBannersByOrder(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 9999);
  const orderB = normalizeSortOrder(b.sortOrder, 9999);
  if (orderA !== orderB) return orderA - orderB;
  return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
}

function normalizeBannerType(value, fallback = "main") {
  const next = String(value || "").toLowerCase().trim();
  if (/^[a-z0-9_]{1,64}$/.test(next)) return next;
  return fallback === "" ? "" : "main";
}

/** Existing banners without bannerType are treated as main. */
function resolveBannerType(item) {
  if (!item) return "main";
  return normalizeBannerType(item.bannerType, "main");
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
  item.bannerType = resolveBannerType(item);
  item.placement = normalizePlacement(item.placement, "");
  item.ctaLabel = String(item.ctaLabel || "").trim();
  item.ctaLink = String(item.ctaLink || "").trim();
  item.split = parseBool(item.split, Boolean(item.image && item.mobileImage && item.image !== item.mobileImage));
  item.appOn = parseBool(item.appOn, true);
  item.webOn = parseBool(item.webOn, true);
  item.sortOrder = normalizeSortOrder(item.sortOrder, 9999);
  if (item.image) item.image = resolvePublicUrl(item.image);
  if (item.mobileImage) item.mobileImage = resolvePublicUrl(item.mobileImage);
  return item;
}

async function listAllBannersUnpaged() {
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: false,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortBannersByOrder,
  });
  return result.items || [];
}

async function nextSortOrder() {
  const items = await listAllBannersUnpaged();
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => {
    const order = normalizeSortOrder(item.sortOrder, 0);
    return order > acc ? order : acc;
  }, 0);
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createBanner({
  title,
  description,
  image,
  mobileImage = "",
  status = "active",
  bannerType = "main",
  placement = "",
  ctaLabel = "",
  ctaLink = "",
  split = false,
  appOn = true,
  webOn = true,
  sortOrder,
}) {
  const now = new Date().toISOString();
  const resolvedOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? await nextSortOrder()
      : normalizeSortOrder(sortOrder);
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    image: normalizeImageField(image, "image"),
    mobileImage: normalizeImageField(mobileImage, "mobileImage"),
    status: normalizeStatus(status),
    bannerType: normalizeBannerType(bannerType, "main"),
    placement: normalizePlacement(placement, ""),
    ctaLabel: String(ctaLabel || "").trim(),
    ctaLink: normalizeCtaLink(ctaLink),
    split: parseBool(split, false),
    appOn: parseBool(appOn, true),
    webOn: parseBool(webOn, true),
    sortOrder: resolvedOrder,
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
    let value = v;
    if (MEDIA_FIELDS.has(k)) {
      value = normalizeImageField(v, k);
    } else if (k === "bannerType") {
      value = normalizeBannerType(v, "main");
    } else if (k === "status") {
      value = normalizeStatus(v);
    } else if (k === "placement") {
      value = normalizePlacement(v, "");
    } else if (k === "ctaLabel") {
      value = String(v || "").trim();
    } else if (k === "ctaLink") {
      value = normalizeCtaLink(v);
    } else if (k === "sortOrder") {
      value = normalizeSortOrder(v);
    } else if (k === "split" || k === "appOn" || k === "webOn") {
      value = parseBool(v, k === "split" ? false : true);
    } else if (k === "title" || k === "description") {
      value = String(v || "").trim();
    }
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = value;
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

async function reorderBanners(orderedIds = []) {
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

  const existing = await listAllBannersUnpaged();
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const id of ids) {
    if (!byId.has(id)) {
      const err = new Error(`Banner not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
  }

  const updated = await Promise.all(
    ids.map((id, index) => updateBanner(id, { sortOrder: index + 1 })),
  );

  return updated.sort(sortBannersByOrder);
}

async function deleteBanner(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listBanners({ page = 1, limit = 10, status, search, bannerType } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedType = normalizeBannerType(bannerType, "");
  const searchFilter = buildContainsFilter(["title", "description"], search);
  const realSearch = String(searchFilter.search || "").trim().toLowerCase();
  const needsMemoryFilter = Boolean(normalizedType) || Boolean(realSearch);

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: needsMemoryFilter ? realSearch || "*" : undefined,
    searchFields: needsMemoryFilter ? ["title", "description"] : undefined,
    searchFn: needsMemoryFilter
      ? (item) => {
          if (normalizedType && resolveBannerType(item) !== normalizedType) return false;
          if (!realSearch) return true;
          return ["title", "description"].some((field) => fieldMatchesTerm(item, field, realSearch));
        }
      : undefined,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortBannersByOrder,
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
  reorderBanners,
  toPublicBanner,
  normalizeBannerType,
  normalizePlacement,
  normalizeCtaLink,
  parseBool,
  resolveBannerType,
};
