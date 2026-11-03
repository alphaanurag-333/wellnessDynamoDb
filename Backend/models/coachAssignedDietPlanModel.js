const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  UpdateCommand,
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

function isLegacyPublishedAssignment(item) {
  if (!item) return false;
  if (String(item.pushedAt || "").trim()) return false;
  const pdfKey = String(item.pdfKey || "").trim();
  const plans = Array.isArray(item.plans) ? item.plans : [];
  return Boolean(pdfKey && plans.length > 0);
}

function isVisibleInClientApp(item) {
  return Boolean(String(item?.pushedAt || "").trim()) || isLegacyPublishedAssignment(item);
}

function draftDiffersFromPublished(item) {
  if (!item) return false;
  const draftPlans = Array.isArray(item.plans) ? item.plans : [];
  if (!String(item.pushedAt || "").trim()) {
    return draftPlans.length > 0;
  }
  const publishedPlans = Array.isArray(item.publishedPlans) ? item.publishedPlans : [];
  if (!publishedPlans.length) return true;
  return JSON.stringify(draftPlans) !== JSON.stringify(publishedPlans);
}

function resolvePublishedPlans(item) {
  if (String(item?.pushedAt || "").trim()) {
    const published = Array.isArray(item.publishedPlans) ? item.publishedPlans : [];
    if (published.length) return published;
    return Array.isArray(item.plans) ? item.plans : [];
  }
  if (isLegacyPublishedAssignment(item)) {
    return Array.isArray(item.plans) ? item.plans : [];
  }
  return [];
}

function resolvePublishedPdfKey(item) {
  if (String(item?.pushedAt || "").trim()) {
    return String(item.publishedPdfKey || item.pdfKey || "").trim() || null;
  }
  if (isLegacyPublishedAssignment(item)) {
    return String(item.pdfKey || "").trim() || null;
  }
  return null;
}

function toCoachAssignedDietPlanPublic(item, { audience = "admin" } = {}) {
  const row = withLegacyId(item);
  if (!row) return null;

  const draftPlans = Array.isArray(row.plans) ? row.plans : [];
  const pushedAt = row.pushedAt || null;
  const publishedPdfKey = resolvePublishedPdfKey(row);

  if (audience === "user") {
    if (!isVisibleInClientApp(row)) return null;
    const plans = resolvePublishedPlans(row);
    return {
      id: row.id,
      _id: row._id,
      userId: row.userId,
      coachId: row.coachId,
      startDate: row.startDate,
      note: row.note ?? null,
      plans,
      pdfKey: publishedPdfKey,
      pdfUrl: resolvePublicUrl(publishedPdfKey),
      createdByRole: normalizeCreatedByRole(row.createdByRole),
      createdById: row.createdById,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      pushedAt,
    };
  }

  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    startDate: row.startDate,
    note: row.note ?? null,
    plans: draftPlans,
    pdfKey: row.pdfKey || null,
    pdfUrl: row.pdfKey ? resolvePublicUrl(row.pdfKey) : null,
    publishedPdfKey,
    publishedPdfUrl: publishedPdfKey ? resolvePublicUrl(publishedPdfKey) : null,
    pushedAt,
    hasUnpublishedChanges: draftDiffersFromPublished(row),
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

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    startDate: normalizeStartDate(startDate),
    note: normalizeNote(note),
    plans: normalizePlans(plans),
    createdByRole: normalizeCreatedByRole(createdByRole),
    createdById: creatorId,
    createdAt: now,
    updatedAt: now,
  };
  if (pdf) item.pdfKey = pdf;

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

async function listCoachAssignedDietPlansByUserId(userId, options = {}) {
  const items = await queryCoachAssignedDietPlansByUserId(userId);
  const audience = options.audience === "user" ? "user" : "admin";
  return items
    .map((row) => toCoachAssignedDietPlanPublic(row, { audience }))
    .filter(Boolean);
}

async function listClientVisibleCoachAssignedDietPlansByUserId(userId) {
  const items = await queryCoachAssignedDietPlansByUserId(userId);
  return items
    .filter(isVisibleInClientApp)
    .map((row) => toCoachAssignedDietPlanPublic(row, { audience: "user" }))
    .filter(Boolean);
}

async function updateCoachAssignedDietPlan(id, {
  plans,
  pdfKey,
  note,
  startDate,
  publishedPlans,
  publishedPdfKey,
  pushedAt,
} = {}) {
  const assignmentId = String(id || "").trim();
  if (!assignmentId) throw new Error("id is required");

  const existing = await getCoachAssignedDietPlanRecordById(assignmentId);
  if (!existing) {
    const err = new Error("Assignment not found");
    err.name = "NotFoundError";
    throw err;
  }

  const names = { "#updatedAt": "updatedAt" };
  const values = { ":updatedAt": new Date().toISOString() };
  const sets = ["#updatedAt = :updatedAt"];

  if (plans !== undefined) {
    names["#plans"] = "plans";
    values[":plans"] = normalizePlans(plans);
    sets.push("#plans = :plans");
  }
  if (pdfKey !== undefined) {
    names["#pdfKey"] = "pdfKey";
    values[":pdfKey"] = String(pdfKey || "").trim();
    sets.push("#pdfKey = :pdfKey");
  }
  if (note !== undefined) {
    names["#note"] = "note";
    values[":note"] = normalizeNote(note);
    sets.push("#note = :note");
  }
  if (startDate !== undefined) {
    names["#startDate"] = "startDate";
    values[":startDate"] = normalizeStartDate(startDate);
    sets.push("#startDate = :startDate");
  }
  if (publishedPlans !== undefined) {
    names["#publishedPlans"] = "publishedPlans";
    values[":publishedPlans"] = normalizePlans(publishedPlans);
    sets.push("#publishedPlans = :publishedPlans");
  }
  if (publishedPdfKey !== undefined) {
    names["#publishedPdfKey"] = "publishedPdfKey";
    values[":publishedPdfKey"] = String(publishedPdfKey || "").trim();
    sets.push("#publishedPdfKey = :publishedPdfKey");
  }
  if (pushedAt !== undefined) {
    names["#pushedAt"] = "pushedAt";
    values[":pushedAt"] = pushedAt ? String(pushedAt).trim() : null;
    sets.push("#pushedAt = :pushedAt");
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id: assignmentId },
      UpdateExpression: `SET ${sets.join(", ")}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toCoachAssignedDietPlanPublic(Attributes);
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
  if (record.publishedPdfKey && record.publishedPdfKey !== record.pdfKey) {
    await deleteStoredMedia(record.publishedPdfKey);
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
  listClientVisibleCoachAssignedDietPlansByUserId,
  deleteCoachAssignedDietPlan,
  updateCoachAssignedDietPlan,
  isDietPlanCatalogReferenced,
  toCoachAssignedDietPlanPublic,
  isVisibleInClientApp,
  draftDiffersFromPublished,
  isLegacyPublishedAssignment,
  normalizeStartDate,
  normalizeCreatedByRole,
};
