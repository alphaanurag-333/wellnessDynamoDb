const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  getWellnessYogaById,
  getWellnessYogaRecordById,
} = require("./wellnessYogaModel");

const TABLE = "AssignedWellnessYoga";
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
  const yt = String(item.ytLink || "").trim();
  if (yt) return yt;
  const type = String(item.type || "").toLowerCase();
  if (type === "ytlink") return String(item.ytLink || "").trim();
  if (type === "video" || type === "audio") return String(item.file || "").trim();
  return "";
}

function toAssignedWellnessYogaPublic(item, yoga = null) {
  const row = withLegacyId(item);
  if (!row) return null;

  const base = {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    yogaId: row.yogaId,
    coachId: row.coachId,
    assignedByRole: normalizeAssignedByRole(row.assignedByRole),
    assignedById: row.assignedById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (!yoga) return base;

  return {
    ...base,
    yoga: {
      id: yoga.id || yoga._id,
      _id: yoga._id || yoga.id,
      title: yoga.title,
      type: yoga.type,
      mediaType: yoga.mediaType,
      ytLink: yoga.ytLink,
      file: yoga.file,
      thumbnail: yoga.thumbnail,
      duration: yoga.duration,
      link: resolvePlaybackLink(yoga),
      status: yoga.status,
    },
  };
}

async function queryAssignedWellnessYogaByUserId(userId) {
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

async function listAssignedWellnessYogaByUserId(userId) {
  const items = await queryAssignedWellnessYogaByUserId(userId);
  const hydrated = await Promise.all(
    items.map(async (row) => {
      const yoga = await getWellnessYogaById(row.yogaId);
      if (!yoga || String(yoga.status || "").toLowerCase() !== "active") {
        return null;
      }
      return toAssignedWellnessYogaPublic(row, yoga);
    })
  );
  return hydrated.filter(Boolean);
}

async function getAssignedWellnessYogaRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function assignWellnessYogaToUser({
  userId,
  yogaIds,
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
    (yogaIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  )];

  if (uniqueIds.length === 0) {
    const err = new Error("At least one yoga item is required");
    err.name = "ValidationError";
    throw err;
  }

  const existing = await queryAssignedWellnessYogaByUserId(uid);
  const existingItemIds = new Set(existing.map((row) => String(row.yogaId || "")));

  const created = [];
  const skippedInvalid = [];
  const skippedDuplicate = [];

  for (const yogaId of uniqueIds) {
    if (existingItemIds.has(yogaId)) {
      skippedDuplicate.push(yogaId);
      continue;
    }

    const record = await getWellnessYogaRecordById(yogaId);
    if (!record || String(record.status || "").toLowerCase() !== "active") {
      skippedInvalid.push(yogaId);
      continue;
    }

    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      userId: uid,
      yogaId,
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

    const yoga = await getWellnessYogaById(yogaId);
    created.push(toAssignedWellnessYogaPublic(item, yoga));
    existingItemIds.add(yogaId);
  }

  if (created.length === 0 && skippedInvalid.length === 0 && skippedDuplicate.length === 0) {
    const err = new Error("No yoga items could be assigned");
    err.name = "ValidationError";
    throw err;
  }

  return { created, skippedInvalid, skippedDuplicate };
}

async function deleteAssignedWellnessYoga(id) {
  const record = await getAssignedWellnessYogaRecordById(id);
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

  return toAssignedWellnessYogaPublic(record);
}

module.exports = {
  assignWellnessYogaToUser,
  listAssignedWellnessYogaByUserId,
  getAssignedWellnessYogaRecordById,
  deleteAssignedWellnessYoga,
  toAssignedWellnessYogaPublic,
  normalizeAssignedByRole,
  resolvePlaybackLink,
};
