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
} = require("../utils/dynamoList");

const TABLE = "MedicalConditionQuestion";
const MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS = ["active", "inactive"];
const MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE = ["yes_no", "yes_no_text", "text", "date"];
const STATUS = new Set(MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS);
const ANSWER_TYPE = new Set(MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE);
const SORT_ORDER_MIN = 0;
const SORT_ORDER_MAX = 100000;

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeAnswerType(value, fallback = "text") {
  const next = String(value || fallback).toLowerCase().trim();
  return ANSWER_TYPE.has(next) ? next : fallback;
}

function normalizeSortOrder(value, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < SORT_ORDER_MIN) return fallback;
  return Math.min(Math.floor(n), SORT_ORDER_MAX);
}

function sortQuestionsByOrder(a, b) {
  const orderA = normalizeSortOrder(a.sortOrder, 0);
  const orderB = normalizeSortOrder(b.sortOrder, 0);
  if (orderA !== orderB) return orderA - orderB;
  return String(a.createdAt || "").localeCompare(String(b.createdAt || ""));
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "answerType") return normalizeAnswerType(value);
  if (key === "question") return String(value || "").trim();
  if (key === "sortOrder") return normalizeSortOrder(value);
  return value;
}

async function listAllQuestionsUnpaged() {
  const result = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: undefined,
    scanIndexForward: true,
    page: 1,
    limit: Number.MAX_SAFE_INTEGER,
    maxLimit: Number.MAX_SAFE_INTEGER,
    sortFn: sortQuestionsByOrder,
  });
  return result.items || [];
}

async function nextSortOrder() {
  const items = await listAllQuestionsUnpaged();
  if (!items.length) return 1;
  const max = items.reduce((acc, item) => {
    const order = normalizeSortOrder(item.sortOrder, 0);
    return order > acc ? order : acc;
  }, 0);
  if (max === 0) return items.length + 1;
  return Math.min(max + 1, SORT_ORDER_MAX);
}

async function createMedicalConditionQuestion({
  question,
  answerType = "text",
  status = "active",
  sortOrder,
} = {}) {
  const now = new Date().toISOString();
  const resolvedOrder =
    sortOrder === undefined || sortOrder === null || sortOrder === ""
      ? await nextSortOrder()
      : normalizeSortOrder(sortOrder);

  const item = {
    id: uuidv4(),
    question: String(question || "").trim(),
    answerType: normalizeAnswerType(answerType),
    status: normalizeStatus(status),
    sortOrder: resolvedOrder,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(new PutCommand({
    TableName: TABLE,
    Item: item,
    ConditionExpression: "attribute_not_exists(id)",
  }));
  return withLegacyId(item);
}

async function getMedicalConditionQuestionRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getMedicalConditionQuestionById(id) {
  const item = await getMedicalConditionQuestionRecordById(id);
  return item ? withLegacyId(item) : null;
}

async function updateMedicalConditionQuestion(id, updates) {
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
  return withLegacyId(Attributes || null);
}

async function deleteMedicalConditionQuestion(id) {
  await docClient.send(new DeleteCommand({
    TableName: TABLE,
    Key: { id },
    ConditionExpression: "attribute_exists(id)",
  }));
}

/** Active questions for the onboarding flow, in admin-defined order. */
async function listActiveMedicalConditionQuestions() {
  const { items } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: "active",
    scanIndexForward: true,
    page: 1,
    limit: 500,
    maxLimit: 500,
    sortFn: sortQuestionsByOrder,
  });
  return items.map((q) => ({
    id: q.id,
    _id: q.id,
    question: q.question,
    answerType: normalizeAnswerType(q.answerType),
    sortOrder: normalizeSortOrder(q.sortOrder, 0),
  }));
}

async function listMedicalConditionQuestions({ page = 1, limit = 10, status, search } = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const searchFilter = buildContainsFilter(["question"], search);
  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression: searchFilter.filterExpression,
    exprNames: searchFilter.exprNames,
    exprValues: searchFilter.exprValues,
    search: searchFilter.search,
    searchFields: searchFilter.searchFields,
    scanIndexForward: true,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortQuestionsByOrder,
  });

  return {
    questions: items.map((row) => withLegacyId(row)),
    pagination,
  };
}

/**
 * Persist display order. `orderedIds` is the full list in desired order (1-based sortOrder).
 */
async function reorderMedicalConditionQuestions(orderedIds = []) {
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

  const existing = await listAllQuestionsUnpaged();
  const byId = new Map(existing.map((item) => [item.id, item]));

  for (const id of ids) {
    if (!byId.has(id)) {
      const err = new Error(`Medical condition question not found: ${id}`);
      err.statusCode = 404;
      throw err;
    }
  }

  const updated = await Promise.all(
    ids.map((id, index) => updateMedicalConditionQuestion(id, { sortOrder: index + 1 })),
  );

  return updated.sort(sortQuestionsByOrder);
}

module.exports = {
  MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS,
  MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE,
  SORT_ORDER_MIN,
  SORT_ORDER_MAX,
  normalizeStatus,
  normalizeAnswerType,
  normalizeSortOrder,
  createMedicalConditionQuestion,
  getMedicalConditionQuestionById,
  getMedicalConditionQuestionRecordById,
  updateMedicalConditionQuestion,
  deleteMedicalConditionQuestion,
  listMedicalConditionQuestions,
  listActiveMedicalConditionQuestions,
  reorderMedicalConditionQuestions,
};
