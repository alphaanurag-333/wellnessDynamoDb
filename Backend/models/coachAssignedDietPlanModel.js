const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { resolvePublicUrl, deleteStoredMedia } = require("../utils/s3");

const TABLE = "CoachAssignedDietPlan";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeStartDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error("startDate is required");
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("startDate must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeNote(value) {
  if (value === undefined || value === null) return null;
  const note = String(value).trim();
  if (!note) return null;
  if (note.length > 2000) {
    const err = new Error("note cannot exceed 2000 characters");
    err.name = "ValidationError";
    throw err;
  }
  return note;
}

function normalizePlans(plans) {
  if (!Array.isArray(plans) || plans.length === 0) {
    const err = new Error("At least one diet plan is required");
    err.name = "ValidationError";
    throw err;
  }
  return plans.map((plan) => ({
    planId: String(plan.planId || "").trim(),
    name: String(plan.name || "").trim(),
    type: String(plan.type || "GENERAL").toUpperCase(),
    category: String(plan.category || "").trim(),
    description: String(plan.description || "").trim(),
    meals: Array.isArray(plan.meals) ? plan.meals : [],
  }));
}

function toCoachAssignedDietPlanPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    startDate: row.startDate,
    note: row.note ?? null,
    plans: Array.isArray(row.plans) ? row.plans : [],
    pdfKey: row.pdfKey,
    pdfUrl: resolvePublicUrl(row.pdfKey),
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createCoachAssignedDietPlan({
  userId,
  coachId,
  startDate,
  note,
  plans,
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
    startDate: normalizeStartDate(startDate),
    note: normalizeNote(note),
    plans: normalizePlans(plans),
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

  return toCoachAssignedDietPlanPublic(item);
}

async function getCoachAssignedDietPlanRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getCoachAssignedDietPlanById(id) {
  const item = await getCoachAssignedDietPlanRecordById(id);
  return item ? toCoachAssignedDietPlanPublic(item) : null;
}

async function queryCoachAssignedDietPlansByUserId(userId) {
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

async function listCoachAssignedDietPlansByUserId(userId) {
  const items = await queryCoachAssignedDietPlansByUserId(userId);
  return items.map((row) => toCoachAssignedDietPlanPublic(row)).filter(Boolean);
}

async function deleteCoachAssignedDietPlan(id) {
  const record = await getCoachAssignedDietPlanRecordById(id);
  if (!record) {
    const err = new Error("Assignment not found");
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

  return toCoachAssignedDietPlanPublic(record);
}

async function isDietPlanCatalogReferenced(planId) {
  const slug = String(planId || "").trim();
  if (!slug) return false;

  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "#plans",
        ExpressionAttributeNames: { "#plans": "plans" },
        ExclusiveStartKey: lastKey,
        Limit: 100,
      })
    );
    for (const item of Items || []) {
      const plans = Array.isArray(item.plans) ? item.plans : [];
      if (plans.some((p) => String(p.planId || "") === slug)) return true;
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return false;
}

module.exports = {
  createCoachAssignedDietPlan,
  getCoachAssignedDietPlanById,
  getCoachAssignedDietPlanRecordById,
  listCoachAssignedDietPlansByUserId,
  deleteCoachAssignedDietPlan,
  isDietPlanCatalogReferenced,
  toCoachAssignedDietPlanPublic,
  normalizeStartDate,
  normalizeCreatedByRole,
};
