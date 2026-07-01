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
  getActiveLaunchFocusAreasByIds,
  normalizeFocusAreaIds,
  validateActiveFocusAreaIds,
} = require("./launchFocusAreaModel");

const TABLE = "UserLaunchAssessment";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);
const SCORE_MIN = 0;
const SCORE_MAX = 750;

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeAssessmentDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error("assessmentDate is required");
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("assessmentDate must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeTotalScore(value) {
  if (value === null || value === undefined || value === "") {
    const err = new Error("totalScore is required");
    err.name = "ValidationError";
    throw err;
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    const err = new Error(`totalScore must be a number between ${SCORE_MIN} and ${SCORE_MAX}`);
    err.name = "ValidationError";
    throw err;
  }
  if (n < SCORE_MIN || n > SCORE_MAX) {
    const err = new Error(`totalScore must be between ${SCORE_MIN} and ${SCORE_MAX}`);
    err.name = "ValidationError";
    throw err;
  }
  return Math.round(n);
}

function toUserLaunchAssessmentPublic(item, focusAreas = null) {
  const row = withLegacyId(item);
  if (!row) return null;
  const focusAreaIds = normalizeFocusAreaIds(row.focusAreaIds);
  const resolved =
    focusAreas !== null
      ? focusAreas
      : focusAreaIds.length
        ? undefined
        : [];
  const base = {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    assessmentDate: row.assessmentDate,
    totalScore: Number(row.totalScore) || 0,
    focusAreaIds,
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
  if (resolved !== undefined) {
    base.focusAreas = resolved;
    base.areasToFocus = resolved.map((area) => area.title);
  }
  return base;
}

async function enrichAssessmentPublic(item) {
  if (!item) return null;
  const focusAreaIds = normalizeFocusAreaIds(item.focusAreaIds);
  const focusAreas = focusAreaIds.length ? await getActiveLaunchFocusAreasByIds(focusAreaIds) : [];
  return toUserLaunchAssessmentPublic(item, focusAreas);
}

async function queryAssessmentsByUserId(userId) {
  const uid = String(userId || "").trim();
  if (!uid) return [];

  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new QueryCommand({
        TableName: TABLE,
        IndexName: "UserAssessmentDateIndex",
        KeyConditionExpression: "#userId = :userId",
        ExpressionAttributeNames: { "#userId": "userId" },
        ExpressionAttributeValues: { ":userId": uid },
        ScanIndexForward: true,
        ExclusiveStartKey: lastKey,
      })
    );

    items.push(...(Items || []));
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

async function getUserLaunchAssessmentByUserAndDate(userId, assessmentDate) {
  const uid = String(userId || "").trim();
  const date = normalizeAssessmentDate(assessmentDate);
  const items = await queryAssessmentsByUserId(uid);
  const match = items.find((row) => String(row.assessmentDate) === date);
  return match ? enrichAssessmentPublic(match) : null;
}

async function listUserLaunchAssessmentsByUserId(userId) {
  const items = await queryAssessmentsByUserId(userId);
  const rows = await Promise.all(items.map((row) => enrichAssessmentPublic(row)));
  return rows.filter(Boolean);
}

async function getUserLaunchAssessmentById(id) {
  const item = await getUserLaunchAssessmentRecordById(id);
  return item ? enrichAssessmentPublic(item) : null;
}

async function getUserLaunchAssessmentRecordById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  return withLegacyId(Item || null);
}

async function createUserLaunchAssessment({
  userId,
  coachId,
  assessmentDate,
  totalScore,
  focusAreaIds = [],
  createdByRole = "wellness_coach",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(createdById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("createdById is required");

  const date = normalizeAssessmentDate(assessmentDate);
  const existing = await getUserLaunchAssessmentByUserAndDate(uid, date);
  if (existing) {
    const err = new Error("An assessment already exists for this date");
    err.name = "ConflictError";
    throw err;
  }

  const validatedFocusAreaIds = await validateActiveFocusAreaIds(focusAreaIds);

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    assessmentDate: date,
    totalScore: normalizeTotalScore(totalScore),
    focusAreaIds: validatedFocusAreaIds,
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

  return enrichAssessmentPublic(item);
}

async function updateUserLaunchAssessment(id, { assessmentDate, totalScore, focusAreaIds } = {}) {
  const current = await getUserLaunchAssessmentRecordById(id);
  if (!current) {
    const err = new Error("Assessment not found");
    err.name = "NotFoundError";
    throw err;
  }

  const updates = {};
  if (assessmentDate !== undefined) {
    const date = normalizeAssessmentDate(assessmentDate);
    if (date !== current.assessmentDate) {
      const conflict = await getUserLaunchAssessmentByUserAndDate(current.userId, date);
      if (conflict && conflict.id !== id) {
        const err = new Error("An assessment already exists for this date");
        err.name = "ConflictError";
        throw err;
      }
      updates.assessmentDate = date;
    }
  }
  if (totalScore !== undefined) {
    updates.totalScore = normalizeTotalScore(totalScore);
  }
  if (focusAreaIds !== undefined) {
    updates.focusAreaIds = await validateActiveFocusAreaIds(focusAreaIds);
  }

  if (Object.keys(updates).length === 0) {
    return enrichAssessmentPublic(current);
  }

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const [k, v] of Object.entries(updates)) {
    exprNames[`#${k}`] = k;
    exprValues[`:${k}`] = v;
    setExpr += `, #${k} = :${k}`;
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

  return enrichAssessmentPublic(Attributes);
}

async function deleteUserLaunchAssessment(id) {
  const record = await getUserLaunchAssessmentRecordById(id);
  if (!record) {
    const err = new Error("Assessment not found");
    err.name = "NotFoundError";
    throw err;
  }

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );

  return enrichAssessmentPublic(record);
}

module.exports = {
  SCORE_MIN,
  SCORE_MAX,
  normalizeAssessmentDate,
  normalizeTotalScore,
  normalizeCreatedByRole,
  createUserLaunchAssessment,
  getUserLaunchAssessmentById,
  getUserLaunchAssessmentRecordById,
  getUserLaunchAssessmentByUserAndDate,
  listUserLaunchAssessmentsByUserId,
  updateUserLaunchAssessment,
  deleteUserLaunchAssessment,
  enrichAssessmentPublic,
  toUserLaunchAssessmentPublic,
};
