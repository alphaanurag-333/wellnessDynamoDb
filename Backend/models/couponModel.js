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

const TABLE = "Coupon";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_DISCOUNT_TYPES = new Set(["percentage", "fixed"]);

function normalizeStatus(status, fallback = "active") {
  const next = String(status || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeDiscountType(discountType, fallback = "percentage") {
  const next = String(discountType || fallback).toLowerCase().trim();
  return ALLOWED_DISCOUNT_TYPES.has(next) ? next : fallback;
}

function normalizeCouponCode(couponCode) {
  return String(couponCode || "").trim().toUpperCase();
}

function normalizeValue(value, discountType) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) {
    throw new Error("value must be a non-negative number");
  }
  if (discountType === "percentage" && num > 100) {
    throw new Error("percentage value cannot exceed 100");
  }
  return num;
}

async function getCouponByCode(couponCode) {
  const code = normalizeCouponCode(couponCode);
  if (!code) return null;

  const { Items } = await docClient.send(new QueryCommand({
    TableName: TABLE,
    IndexName: "CouponCodeIndex",
    KeyConditionExpression: "couponCode = :couponCode",
    ExpressionAttributeValues: { ":couponCode": code },
    Limit: 1,
  }));

  return Items?.[0] || null;
}

async function createCoupon({
  title,
  status = "active",
  couponCode,
  discountType = "percentage",
  value,
}) {
  const normalizedCode = normalizeCouponCode(couponCode);
  const normalizedType = normalizeDiscountType(discountType);
  const normalizedValue = normalizeValue(value, normalizedType);

  if (!String(title || "").trim()) {
    throw new Error("title is required");
  }
  if (!normalizedCode) {
    throw new Error("couponCode is required");
  }

  const existing = await getCouponByCode(normalizedCode);
  if (existing) {
    const err = new Error("coupon code already exists");
    err.code = "DUPLICATE_COUPON_CODE";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: String(title).trim(),
    status: normalizeStatus(status),
    couponCode: normalizedCode,
    discountType: normalizedType,
    value: normalizedValue,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));

  return item;
}

async function getCouponById(id) {
  const { Item } = await docClient.send(new GetCommand({
    TableName: TABLE,
    Key: { id },
  }));
  return Item || null;
}

async function updateCoupon(id, updates) {
  const entries = Object.entries(updates || {}).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    const n = `#${key}`;
    const v = `:${key}`;
    exprNames[n] = key;
    exprValues[v] = value;
    setExpr += `, ${n} = ${v}`;
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

  return Attributes || null;
}

async function deleteCoupon(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

async function listCoupons({ page = 1, limit = 20, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["title", "couponCode", "discountType"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    coupons: items,
    pagination,
  };
}

module.exports = {
  createCoupon,
  getCouponById,
  getCouponByCode,
  updateCoupon,
  deleteCoupon,
  listCoupons,
  normalizeStatus,
  normalizeDiscountType,
  normalizeCouponCode,
  normalizeValue,
  ALLOWED_DISCOUNT_TYPES,
};
