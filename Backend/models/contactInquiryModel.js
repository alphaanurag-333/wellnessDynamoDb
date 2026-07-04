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
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "ContactInquiry";
const STATUS = new Set(["new", "read", "archived"]);
const INQUIRY_TYPES = new Set(["consultation", "program", "appointment", "general"]);

const FIELD_LIMITS = {
  firstName: 20,
  lastName: 20,
  email: 50,
  phoneCountryCode: 6,
  phoneNational: 15,
  phone: 24,
  message: 500,
};

function isIndiaDial(code) {
  const normalized = String(code ?? "").trim().replace(/\s+/g, "");
  return normalized === "+91" || normalized === "91";
}

function sanitizePhoneCountryCode(value) {
  const code = String(value ?? "").trim().replace(/\s+/g, "");
  if (!code) {
    const err = new Error("phone country code is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  const withPlus = code.startsWith("+") ? code : `+${code}`;
  if (withPlus.length > FIELD_LIMITS.phoneCountryCode || !/^\+\d{1,4}$/.test(withPlus)) {
    const err = new Error("phone country code is invalid");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return withPlus;
}

function sanitizeNationalPhone(value, countryCode) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) {
    const err = new Error("phone is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (!/^\d+$/.test(digits)) {
    const err = new Error("phone should contain digits only");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (isIndiaDial(countryCode)) {
    if (digits.length !== 10) {
      const err = new Error("Indian mobile number must be 10 digits");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      const err = new Error("Indian mobile number must start with 6, 7, 8, or 9");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    if (/^(\d)\1{9}$/.test(digits)) {
      const err = new Error("phone is not valid");
      err.code = "VALIDATION_ERROR";
      throw err;
    }
    return digits;
  }
  if (digits.length < 4 || digits.length > FIELD_LIMITS.phoneNational) {
    const err = new Error("phone must be 4 to 15 digits");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return digits;
}

function formatPhone(countryCode, nationalDigits) {
  return `${countryCode} ${nationalDigits}`;
}

function normalizeStatus(value, fallback = "new") {
  const next = String(value || fallback).trim().toLowerCase();
  return STATUS.has(next) ? next : fallback;
}

function normalizeInquiryType(value) {
  const next = String(value || "").trim().toLowerCase();
  if (!INQUIRY_TYPES.has(next)) {
    const err = new Error("inquiryType is invalid");
    err.code = "INVALID_INQUIRY_TYPE";
    throw err;
  }
  return next;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeName(value, fieldName) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (!text) {
    const err = new Error(`${fieldName} is required`);
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (text.length > FIELD_LIMITS.firstName) {
    const err = new Error(`${fieldName} is too long`);
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return text;
}

function sanitizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!email) {
    const err = new Error("email is required");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (email.length > FIELD_LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    const err = new Error("email is invalid");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return email;
}

function sanitizePhone(value, countryCode) {
  const phoneCountryCode = sanitizePhoneCountryCode(countryCode);
  const national = sanitizeNationalPhone(value, phoneCountryCode);
  const fullPhone = formatPhone(phoneCountryCode, national);
  if (fullPhone.length > FIELD_LIMITS.phone) {
    const err = new Error("phone is too long");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return { phoneCountryCode, phone: fullPhone };
}

function sanitizeMessage(value) {
  const message = String(value || "").replace(/\r\n/g, "\n").trim();
  if (!message || message.length < 5) {
    const err = new Error("message must be at least 5 characters");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  if (message.length > FIELD_LIMITS.message) {
    const err = new Error("message is too long");
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  return message;
}

function validateCreateInput(input = {}) {
  const phoneData = sanitizePhone(input.phone, input.phoneCountryCode || "+91");
  return {
    firstName: sanitizeName(input.firstName, "firstName"),
    lastName: sanitizeName(input.lastName, "lastName"),
    email: sanitizeEmail(input.email),
    phoneCountryCode: phoneData.phoneCountryCode,
    phone: phoneData.phone,
    inquiryType: normalizeInquiryType(input.inquiryType || input.inquiry),
    message: sanitizeMessage(input.message),
  };
}

async function createContactInquiry(input) {
  const data = validateCreateInput(input);
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    ...data,
    status: "new",
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

  return withLegacyId(item);
}

async function getContactInquiryById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function updateContactInquiry(id, updates) {
  const allowed = new Set(["status"]);
  const entries = Object.entries(updates || {})
    .filter(([key, value]) => allowed.has(key) && value !== undefined)
    .map(([key, value]) => [key, key === "status" ? normalizeStatus(value) : value]);

  if (entries.length === 0) {
    throw new Error("No valid fields provided for update");
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [key, value] of entries) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = value;
    setExpr += `, #${key} = :${key}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return withLegacyId(Attributes || null);
}

async function deleteContactInquiry(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listContactInquiries({ page = 1, limit = 20, status, search, inquiryType } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(
    ["firstName", "lastName", "email", "phone", "message"],
    search
  );

  let filterExpression = searchFilter.filterExpression;
  const exprNames = { ...searchFilter.exprNames };
  const exprValues = { ...searchFilter.exprValues };

  const normalizedInquiryType = String(inquiryType || "").trim().toLowerCase();
  if (normalizedInquiryType && INQUIRY_TYPES.has(normalizedInquiryType)) {
    exprNames["#inquiryType"] = "inquiryType";
    exprValues[":inquiryType"] = normalizedInquiryType;
    filterExpression = filterExpression
      ? `${filterExpression} AND #inquiryType = :inquiryType`
      : "#inquiryType = :inquiryType";
  }

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyName: "status",
    partitionKeyValue: normalizedStatus || undefined,
    statusPartitions: ["new", "read", "archived"],
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
    contactInquiries: items.map(withLegacyId),
    pagination,
  };
}

module.exports = {
  TABLE,
  FIELD_LIMITS,
  INQUIRY_TYPES,
  createContactInquiry,
  getContactInquiryById,
  updateContactInquiry,
  deleteContactInquiry,
  listContactInquiries,
  normalizeStatus,
  normalizeInquiryType,
};
