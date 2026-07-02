const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  getMentalWellbeingById,
  getMentalWellbeingRecordById,
} = require("./mentalWellbeingModel");

const TABLE = "AssignedMentalWellbeing";
const ASSIGNED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeAssignedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return ASSIGNED_BY_ROLES.has(next) ? next : fallback;
}

function resolvePlaybackLink(item) {
  if (!item) return "";
  const type = String(item.type || "").toLowerCase();
  if (type === "ytlink") return String(item.ytLink || "").trim();
  if (type === "video" || type === "audio") return String(item.file || "").trim();
  return "";
}

function toAssignedMentalWellbeingPublic(item, mentalWellbeing = null) {
  const row = withLegacyId(item);
  if (!row) return null;

  const base = {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    mentalWellbeingId: row.mentalWellbeingId,
    coachId: row.coachId,
    assignedByRole: normalizeAssignedByRole(row.assignedByRole),
    assignedById: row.assignedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!mentalWellbeing) return base;

  return {
    ...base,
    mentalWellbeing: {
      id: mentalWellbeing.id || mentalWellbeing._id,
      _id: mentalWellbeing._id || mentalWellbeing.id,
      title: mentalWellbeing.title,
      type: mentalWellbeing.type,
      ytLink: mentalWellbeing.ytLink,
      file: mentalWellbeing.file,
      link: resolvePlaybackLink(mentalWellbeing),
      status: mentalWellbeing.status,
    },
  };
}

async function queryAssignedMentalWellbeingByUserId(userId) {
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

async function listAssignedMentalWellbeingByUserId(userId) {
  const items = await queryAssignedMentalWellbeingByUserId(userId);
  const hydrated = await Promise.all(
    items.map(async (row) => {
      const mentalWellbeing = await getMentalWellbeingById(row.mentalWellbeingId);
      if (!mentalWellbeing || String(mentalWellbeing.status || "").toLowerCase() !== "active") {
        return null;
      }
      return toAssignedMentalWellbeingPublic(row, mentalWellbeing);
    })
  );
  return hydrated.filter(Boolean);
}

async function getAssignedMentalWellbeingRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getAssignedMentalWellbeingById(id) {
  const record = await getAssignedMentalWellbeingRecordById(id);
  if (!record) return null;
  const mentalWellbeing = await getMentalWellbeingById(record.mentalWellbeingId);
  if (!mentalWellbeing) return toAssignedMentalWellbeingPublic(record);
  return toAssignedMentalWellbeingPublic(record, mentalWellbeing);
}

async function assignMentalWellbeingToUser({
  userId,
  mentalWellbeingIds,
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
    (mentalWellbeingIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  )];

  if (uniqueIds.length === 0) {
    const err = new Error("At least one mental wellbeing item is required");
    err.name = "ValidationError";
    throw err;
  }

  const existing = await queryAssignedMentalWellbeingByUserId(uid);
  const existingItemIds = new Set(
    existing.map((row) => String(row.mentalWellbeingId || ""))
  );

  const created = [];
  const skippedInvalid = [];
  const skippedDuplicate = [];

  for (const mentalWellbeingId of uniqueIds) {
    if (existingItemIds.has(mentalWellbeingId)) {
      skippedDuplicate.push(mentalWellbeingId);
      continue;
    }

    const record = await getMentalWellbeingRecordById(mentalWellbeingId);
    if (!record || String(record.status || "").toLowerCase() !== "active") {
      skippedInvalid.push(mentalWellbeingId);
      continue;
    }

    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      userId: uid,
      mentalWellbeingId,
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

    const mentalWellbeing = await getMentalWellbeingById(mentalWellbeingId);
    created.push(toAssignedMentalWellbeingPublic(item, mentalWellbeing));
    existingItemIds.add(mentalWellbeingId);
  }

  if (created.length === 0 && skippedInvalid.length === 0 && skippedDuplicate.length === 0) {
    const err = new Error("No mental wellbeing items could be assigned");
    err.name = "ValidationError";
    throw err;
  }

  return { created, skippedInvalid, skippedDuplicate };
}

async function deleteAssignedMentalWellbeing(id) {
  const record = await getAssignedMentalWellbeingRecordById(id);
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

  return toAssignedMentalWellbeingPublic(record);
}

module.exports = {
  assignMentalWellbeingToUser,
  listAssignedMentalWellbeingByUserId,
  getAssignedMentalWellbeingById,
  getAssignedMentalWellbeingRecordById,
  deleteAssignedMentalWellbeing,
  toAssignedMentalWellbeingPublic,
  normalizeAssignedByRole,
  resolvePlaybackLink,
};
