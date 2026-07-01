const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  getPhysicalExerciseById,
  getPhysicalExerciseRecordById,
} = require("./physicalExerciseModel");

const TABLE = "AssignedPhysicalExercise";
const ASSIGNED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeAssignedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return ASSIGNED_BY_ROLES.has(next) ? next : fallback;
}

function toAssignedPhysicalExercisePublic(item, exercise = null) {
  const row = withLegacyId(item);
  if (!row) return null;

  const base = {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    exerciseId: row.exerciseId,
    coachId: row.coachId,
    assignedByRole: normalizeAssignedByRole(row.assignedByRole),
    assignedById: row.assignedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!exercise) return base;

  return {
    ...base,
    exercise: {
      id: exercise.id || exercise._id,
      _id: exercise._id || exercise.id,
      title: exercise.title,
      description: exercise.description,
      type: exercise.type,
      link: exercise.link,
      status: exercise.status,
    },
  };
}

async function queryAssignedPhysicalExercisesByUserId(userId) {
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

async function listAssignedPhysicalExercisesByUserId(userId) {
  const items = await queryAssignedPhysicalExercisesByUserId(userId);
  const hydrated = await Promise.all(
    items.map(async (row) => {
      const exercise = await getPhysicalExerciseById(row.exerciseId);
      if (!exercise || String(exercise.status || "").toLowerCase() !== "active") {
        return null;
      }
      return toAssignedPhysicalExercisePublic(row, exercise);
    })
  );
  return hydrated.filter(Boolean);
}

async function getAssignedPhysicalExerciseRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getAssignedPhysicalExerciseById(id) {
  const record = await getAssignedPhysicalExerciseRecordById(id);
  if (!record) return null;
  const exercise = await getPhysicalExerciseById(record.exerciseId);
  if (!exercise) return toAssignedPhysicalExercisePublic(record);
  return toAssignedPhysicalExercisePublic(record, exercise);
}

async function assignPhysicalExercisesToUser({
  userId,
  exerciseIds,
  coachId,
  assignedByRole = "wellness_coach",
  assignedById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(assignedById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("assignedById is required");

  const uniqueIds = [...new Set(
    (exerciseIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  )];

  if (uniqueIds.length === 0) {
    const err = new Error("At least one exercise is required");
    err.name = "ValidationError";
    throw err;
  }

  const existing = await queryAssignedPhysicalExercisesByUserId(uid);
  const existingExerciseIds = new Set(
    existing.map((row) => String(row.exerciseId || ""))
  );

  const created = [];
  const skippedInvalid = [];
  const skippedDuplicate = [];

  for (const exerciseId of uniqueIds) {
    if (existingExerciseIds.has(exerciseId)) {
      skippedDuplicate.push(exerciseId);
      continue;
    }

    const record = await getPhysicalExerciseRecordById(exerciseId);
    if (!record || String(record.status || "").toLowerCase() !== "active") {
      skippedInvalid.push(exerciseId);
      continue;
    }

    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      userId: uid,
      exerciseId,
      coachId: parentCoachId,
      assignedByRole: normalizeAssignedByRole(assignedByRole),
      assignedById: creatorId,
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

    const exercise = await getPhysicalExerciseById(exerciseId);
    created.push(toAssignedPhysicalExercisePublic(item, exercise));
    existingExerciseIds.add(exerciseId);
  }

  if (created.length === 0 && skippedInvalid.length === 0 && skippedDuplicate.length === 0) {
    const err = new Error("No exercises could be assigned");
    err.name = "ValidationError";
    throw err;
  }

  return { created, skippedInvalid, skippedDuplicate };
}

async function deleteAssignedPhysicalExercise(id) {
  const record = await getAssignedPhysicalExerciseRecordById(id);
  if (!record) {
    const err = new Error("Assignment not found");
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

  return toAssignedPhysicalExercisePublic(record);
}

module.exports = {
  assignPhysicalExercisesToUser,
  listAssignedPhysicalExercisesByUserId,
  getAssignedPhysicalExerciseById,
  getAssignedPhysicalExerciseRecordById,
  deleteAssignedPhysicalExercise,
  toAssignedPhysicalExercisePublic,
  normalizeAssignedByRole,
};
