const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizeMediaField, resolveMediaFields } = require("../utils/s3");
const {
  normalizeMediaItemFromStorage,
  legacyFieldsToRemoveOnUpdate,
  normalizeUpdateFieldName,
} = require("../utils/mediaFieldAliases");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
} = require("../utils/dynamoList");
const { normalizeOrder, sortByOrderAsc } = require("../utils/displayOrder");

const { normalizeVisibleFlag, visibilityFilterParts } = require("./wellnessCoachModel");

const VIDEO_TESTIMONIAL_MEDIA = ["profileImage", "video"];

const TABLE = "VideoTestimonials";
const TYPE = new Set(["link", "video"]);
const STATUS = new Set(["active", "inactive"]);

function normalizeType(value, fallback = "link") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPE.has(next) ? next : fallback;
}

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicVideoTestimonial(item) {
  const row = withLegacyId(normalizeMediaItemFromStorage(item));
  if (!row) return null;
  const resolved = resolveMediaFields(row, VIDEO_TESTIMONIAL_MEDIA);
  resolved.webVisible = normalizeVisibleFlag(resolved.webVisible, true);
  resolved.appVisible = normalizeVisibleFlag(resolved.appVisible, true);
  resolved.order = normalizeOrder(resolved.order, 9999);
  return resolved;
}

function sanitizeUpdateField(key, value) {
  const field = normalizeUpdateFieldName(key);
  if (field === "type") return normalizeType(value);
  if (field === "status") return normalizeStatus(value);
  if (field === "order") return normalizeOrder(value);
  if (field === "webVisible" || field === "appVisible") return normalizeVisibleFlag(value, true);
  if (field === "profileImage" || field === "video") {
    if (value == null || String(value).trim() === "") return "";
    return normalizeMediaField(value, field);
  }
  if (["name", "ytLink"].includes(field)) return String(value).trim();
  return value;
}

async function createVideoTestimonial({
  name,
  profileImage,
  profile_image,
  ytLink,
  video,
  type = "link",
  status = "active",
  webVisible = true,
  appVisible = true,
  order = 0,
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    name: String(name || "").trim(),
    profileImage: normalizeMediaField(profileImage ?? profile_image, "profileImage"),
    ytLink: String(ytLink || "").trim(),
    video: video ? normalizeMediaField(video, "video") : "",
    type: normalizeType(type),
    status: normalizeStatus(status),
    webVisible: normalizeVisibleFlag(webVisible, true),
    appVisible: normalizeVisibleFlag(appVisible, true),
    order: normalizeOrder(order),
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
  return toPublicVideoTestimonial(item);
}

async function getVideoTestimonialRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(normalizeMediaItemFromStorage(Item || null));
}

async function getVideoTestimonialById(id) {
  const item = await getVideoTestimonialRecordById(id);
  return item ? toPublicVideoTestimonial(item) : null;
}

async function updateVideoTestimonial(id, updates) {
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
  return toPublicVideoTestimonial(Attributes || null);
}

async function deleteVideoTestimonial(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listVideoTestimonials({
  page = 1,
  limit = 10,
  type,
  status,
  search,
  platform,
  webVisible,
  appVisible,
} = {}) {
  const normalizedType = type ? normalizeType(type, "") : "";
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["name"], search);
  const channel = String(platform || "").toLowerCase().trim();
  const wantWebVisible =
    webVisible !== undefined ? webVisible : channel === "web" ? true : undefined;
  const wantAppVisible =
    appVisible !== undefined ? appVisible : channel === "app" ? true : undefined;
  const hasTypeFilter = Boolean(normalizedType);
  const hasSearch = Boolean(searchFilter.search);
  const hasVisibilityFilter = wantWebVisible !== undefined || wantAppVisible !== undefined;

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedType) {
    exprNames["#type"] = "type";
    exprValues[":type"] = normalizedType;
    filterExpression = appendFilter(filterExpression, "#type = :type");
  }

  for (const part of [
    visibilityFilterParts("webVisible", wantWebVisible),
    visibilityFilterParts("appVisible", wantAppVisible),
  ]) {
    if (!part) continue;
    Object.assign(exprNames, part.exprNames);
    Object.assign(exprValues, part.exprValues);
    filterExpression = appendFilter(filterExpression, part.expression);
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusOrderIndex",
    partitionKeyValue: normalizedStatus || undefined,
    sortKeyName: "order",
    filterExpression,
    exprNames,
    exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    searchFn: searchFilter.search
      ? (item, term) => {
          if (
            wantWebVisible !== undefined &&
            normalizeVisibleFlag(item.webVisible, true) !== normalizeVisibleFlag(wantWebVisible, true)
          ) {
            return false;
          }
          if (
            wantAppVisible !== undefined &&
            normalizeVisibleFlag(item.appVisible, true) !== normalizeVisibleFlag(wantAppVisible, true)
          ) {
            return false;
          }
          return String(item.name || "")
            .toLowerCase()
            .includes(term);
        }
      : undefined,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByOrderAsc,
  });

  return {
    videoTestimonials: items.map((row) => toPublicVideoTestimonial(row)),
    pagination,
  };
}

module.exports = {
  normalizeType,
  normalizeStatus,
  normalizeOrder,
  normalizeVisibleFlag,
  createVideoTestimonial,
  getVideoTestimonialById,
  getVideoTestimonialRecordById,
  updateVideoTestimonial,
  deleteVideoTestimonial,
  listVideoTestimonials,
};
