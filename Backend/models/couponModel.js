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
const ALLOWED_APPLIES_TO = new Set(["challenge", "consultancy", "program", "subscription", "energy_exchange"]);

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

function normalizeAppliesTo(value) {
  if (value == null || value === "") return ["challenge"];
  const list = Array.isArray(value) ? value : String(value).split(",");
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const next = String(raw || "").toLowerCase().trim();
    if (!ALLOWED_APPLIES_TO.has(next) || seen.has(next)) continue;
    seen.add(next);
    out.push(next);
  }
  return out.length ? out : ["challenge"];
}

function normalizeChallengeIds(value) {
  if (!Array.isArray(value)) return [];
  return value.map((id) => String(id || "").trim()).filter(Boolean);
}

function couponAppliesToChallenge(coupon, challengeId) {
  if (!coupon || normalizeStatus(coupon.status) !== "active") return false;
  const appliesTo = normalizeAppliesTo(coupon.appliesTo);
  if (!appliesTo.includes("challenge")) return false;
  const challengeIds = normalizeChallengeIds(coupon.challengeIds);
  if (!challengeIds.length) return true;
  return challengeIds.includes(String(challengeId || "").trim());
}

function computeCouponDiscount(baseAmount, coupon) {
  const base = Math.max(0, Number(baseAmount) || 0);
  if (!coupon) return 0;
  const type = normalizeDiscountType(coupon.discountType);
  const value = Number(coupon.value) || 0;
  if (type === "percentage") {
    return Math.round((base * (value / 100) + Number.EPSILON) * 100) / 100;
  }
  return Math.min(base, Math.round((value + Number.EPSILON) * 100) / 100);
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
  appliesTo,
  challengeIds,
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
    appliesTo: normalizeAppliesTo(appliesTo),
    challengeIds: normalizeChallengeIds(challengeIds),
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
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
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
  normalizeAppliesTo,
  normalizeChallengeIds,
  couponAppliesToChallenge,
  computeCouponDiscount,
  ALLOWED_DISCOUNT_TYPES,
  ALLOWED_APPLIES_TO,
};
