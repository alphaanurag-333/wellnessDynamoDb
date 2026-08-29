const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  listByPartitionKey,
  buildContainsFilter,
  appendFilter,
} = require("../utils/dynamoList");
const { normalizeOrder, sortByOrderAsc } = require("../utils/displayOrder");
const { normalizeVisibleFlag, visibilityFilterParts } = require("./wellnessCoachModel");

const TABLE = "HealthDisorder";
const STATUS = new Set(["active", "inactive"]);
const TYPES = new Set(["acute", "chronic"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeType(value, fallback = "acute") {
  const next = String(value || fallback).toLowerCase().trim();
  return TYPES.has(next) ? next : fallback;
}

function normalizeSymptoms(value) {
  if (!Array.isArray(value)) return [];
  return value.map((s) => String(s).trim()).filter(Boolean);
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicHealthDisorder(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  row.order = normalizeOrder(row.order, 9999);
  row.webVisible = normalizeVisibleFlag(row.webVisible, true);
  row.appVisible = normalizeVisibleFlag(row.appVisible, true);
  return row;
}

function sanitizeUpdateField(key, value) {
  if (key === "title" || key === "description") return String(value).trim();
  if (key === "symptoms") return normalizeSymptoms(value);
  if (key === "type") return normalizeType(value);
  if (key === "status") return normalizeStatus(value);
  if (key === "order") return normalizeOrder(value);
  if (key === "webVisible" || key === "appVisible") return normalizeVisibleFlag(value, true);
  return value;
}

async function createHealthDisorder({
  title,
  description,
  symptoms = [],
  type = "acute",
  status = "active",
  webVisible = true,
  appVisible = true,
  order = 0,
}) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title || "").trim(),
    description: String(description || "").trim(),
    symptoms: normalizeSymptoms(symptoms),
    type: normalizeType(type),
    status: normalizeStatus(status),
    webVisible: normalizeVisibleFlag(webVisible, true),
    appVisible: normalizeVisibleFlag(appVisible, true),
    order: normalizeOrder(order),
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return toPublicHealthDisorder(item);
}

async function getHealthDisorderById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return toPublicHealthDisorder(Item || null);
}

async function updateHealthDisorder(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);
  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of entries) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
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
  return toPublicHealthDisorder(Attributes || null);
}

async function deleteHealthDisorder(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listHealthDisorders({
  page = 1,
  limit = 10,
  status,
  type,
  search,
  platform,
  webVisible,
  appVisible,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedType = type ? String(type).toLowerCase().trim() : "";
  const searchFilter = buildContainsFilter(["title", "description", "symptoms"], search);
  const channel = String(platform || "").toLowerCase().trim();
  const wantWebVisible =
    webVisible !== undefined ? webVisible : channel === "web" ? true : undefined;
  const wantAppVisible =
    appVisible !== undefined ? appVisible : channel === "app" ? true : undefined;

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  if (normalizedType && TYPES.has(normalizedType)) {
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

  const hasTypeFilter = Boolean(normalizedType && TYPES.has(normalizedType));
  const hasSearch = Boolean(searchFilter.search);
  const hasVisibilityFilter = wantWebVisible !== undefined || wantAppVisible !== undefined;

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
          return ["title", "description"].some((field) =>
            String(item[field] || "")
              .toLowerCase()
              .includes(term)
          ) ||
            (Array.isArray(item.symptoms) &&
              item.symptoms.some((s) =>
                String(s || "")
                  .toLowerCase()
                  .includes(term)
              ));
        }
      : undefined,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: !normalizedStatus || hasTypeFilter || hasSearch || hasVisibilityFilter
      ? sortByOrderAsc
      : undefined,
  });

  return {
    healthDisorders: items.map(toPublicHealthDisorder),
    pagination,
  };
}

module.exports = {
  normalizeStatus,
  normalizeType,
  normalizeOrder,
  normalizeSymptoms,
  normalizeVisibleFlag,
  createHealthDisorder,
  getHealthDisorderById,
  updateHealthDisorder,
  deleteHealthDisorder,
  listHealthDisorders,
};
