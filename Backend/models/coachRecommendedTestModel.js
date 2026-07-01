const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");

const TABLE = "CoachRecommendedTest";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeReportDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error("reportDate is required");
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("reportDate must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeTests(tests) {
  if (!Array.isArray(tests) || tests.length === 0) {
    const err = new Error("At least one test is required");
    err.name = "ValidationError";
    throw err;
  }
  return tests.map((test) => ({
    testId: String(test.testId || "").trim(),
    name: String(test.name || "").trim(),
    type: String(test.type || "SINGLE").toUpperCase(),
    category: String(test.category || "").trim(),
    parameters: Array.isArray(test.parameters) ? test.parameters : [],
  }));
}

function toCoachRecommendedTestPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    reportDate: row.reportDate,
    tests: Array.isArray(row.tests) ? row.tests : [],
    pdfKey: row.pdfKey,
    pdfUrl: resolvePublicUrl(row.pdfKey),
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createCoachRecommendedTest({
  userId,
  coachId,
  reportDate,
  tests,
  pdfKey,
  createdByRole = "wellness_coach",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(createdById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("createdById is required");

  const pdf = String(pdfKey || "").trim();
  if (!pdf) {
    const err = new Error("pdfKey is required");
    err.name = "ValidationError";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    reportDate: normalizeReportDate(reportDate),
    tests: normalizeTests(tests),
    pdfKey: pdf,
    createdByRole: normalizeCreatedByRole(createdByRole),
    createdById: creatorId,
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

  return toCoachRecommendedTestPublic(item);
}

async function getCoachRecommendedTestRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getCoachRecommendedTestById(id) {
  const item = await getCoachRecommendedTestRecordById(id);
  return item ? toCoachRecommendedTestPublic(item) : null;
}

async function queryCoachRecommendedTestsByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserCreatedAtIndex",
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: { "#userId": "userId" },
        ExpressionAttributeValues: { ":userId": uid },
        ScanIndexForward: false,
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function listCoachRecommendedTestsByUserId(userId) {
  const items = await queryCoachRecommendedTestsByUserId(userId);
  return items.map((row) => toCoachRecommendedTestPublic(row)).filter(Boolean);
}

async function deleteCoachRecommendedTest(id) {
  const record = await getCoachRecommendedTestRecordById(id);
  if (!record) {
    const err = new Error("Recommendation not found");
    err.name = "NotFoundError";
    throw err;
  }

  if (record.pdfKey) {
    await deleteStoredMedia(record.pdfKey);
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );

  return toCoachRecommendedTestPublic(record);
}

async function isTestCatalogReferenced(testId) {
  const slug = String(testId || "").trim();
  if (!slug) return false;

  const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "#tests",
        ExpressionAttributeNames: { "#tests": "tests" },
        ExclusiveStartKey: lastKey,
        Limit: 100,
      })
    );
    for (const item of Items || []) {
      const tests = Array.isArray(item.tests) ? item.tests : [];
      if (tests.some((t) => String(t.testId || "") === slug)) return true;
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return false;
}

module.exports = {
  createCoachRecommendedTest,
  getCoachRecommendedTestById,
  getCoachRecommendedTestRecordById,
  listCoachRecommendedTestsByUserId,
  deleteCoachRecommendedTest,
  isTestCatalogReferenced,
  toCoachRecommendedTestPublic,
  normalizeReportDate,
  normalizeCreatedByRole,
};
