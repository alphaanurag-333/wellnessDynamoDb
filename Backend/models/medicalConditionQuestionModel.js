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

const TABLE = "MedicalConditionQuestion";
const MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS = ["active", "inactive"];
const MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE = ["yes_no", "yes_no_text", "text", "date"];
const STATUS = new Set(MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS);
const ANSWER_TYPE = new Set(MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return STATUS.has(next) ? next : fallback;
}

function normalizeAnswerType(value, fallback = "text") {
  const next = String(value || fallback).toLowerCase().trim();
  return ANSWER_TYPE.has(next) ? next : fallback;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "answerType") return normalizeAnswerType(value);
  if (key === "question") return String(value || "").trim();
  return value;
}

async function createMedicalConditionQuestion({ question, answerType = "text", status = "active" }) {
  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    question: String(question || "").trim(),
    answerType: normalizeAnswerType(answerType),
    status: normalizeStatus(status),
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
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    questions: items.map((row) => withLegacyId(row)),
    pagination,
  };
}

module.exports = {
  MEDICAL_CONDITION_QUESTION_ALLOWED_STATUS,
  MEDICAL_CONDITION_QUESTION_ALLOWED_ANSWER_TYPE,
  normalizeStatus,
  normalizeAnswerType,
  createMedicalConditionQuestion,
  getMedicalConditionQuestionById,
  getMedicalConditionQuestionRecordById,
  updateMedicalConditionQuestion,
  deleteMedicalConditionQuestion,
  listMedicalConditionQuestions,
};
