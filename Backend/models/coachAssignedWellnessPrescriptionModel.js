const {
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");

const TABLE = "CoachAssignedWellnessPrescription";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    const err = new Error("date is required");
    err.name = "ValidationError";
    throw err;
  }
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) {
    const err = new Error("date must be a valid date");
    err.name = "ValidationError";
    throw err;
  }
  return d.toISOString().slice(0, 10);
}

function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    const err = new Error("At least one recommendation point is required");
    err.name = "ValidationError";
    throw err;
  }

  return items.map((item, index) => {
    const text = String(item?.text ?? "").trim();
    if (!text) {
      const err = new Error(`Item ${index + 1}: text is required`);
      err.name = "ValidationError";
      throw err;
    }
    if (text.length > 2000) {
      const err = new Error(`Item ${index + 1}: text cannot exceed 2000 characters`);
      err.name = "ValidationError";
      throw err;
    }
    const prescriptionId = item?.prescriptionId
      ? String(item.prescriptionId).trim()
      : null;
    return {
      prescriptionId: prescriptionId || null,
      text,
    };
  });
}

function normalizeSourcePrescriptionIds(ids) {
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))];
}

function toCoachAssignedWellnessPrescriptionPublic(item) {
  const row = withLegacyId(item);
  if (!row) return null;
  return {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    date: row.date,
    items: Array.isArray(row.items) ? row.items : [],
    sourcePrescriptionIds: Array.isArray(row.sourcePrescriptionIds)
      ? row.sourcePrescriptionIds
      : [],
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

async function createCoachAssignedWellnessPrescription({
  userId,
  coachId,
  date,
  items,
  sourcePrescriptionIds = [],
  createdByRole = "wellness_coach",
  createdById,
}) {
  const uid = String(userId || "").trim();
  const parentCoachId = String(coachId || "").trim();
  const creatorId = String(createdById || "").trim();
  if (!uid) throw new Error("userId is required");
  if (!parentCoachId) throw new Error("coachId is required");
  if (!creatorId) throw new Error("createdById is required");

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: parentCoachId,
    date: normalizeDate(date),
    items: normalizeItems(items),
    sourcePrescriptionIds: normalizeSourcePrescriptionIds(sourcePrescriptionIds),
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

  return toCoachAssignedWellnessPrescriptionPublic(item);
}

async function getCoachAssignedWellnessPrescriptionRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return withLegacyId(Item || null);
}

async function getCoachAssignedWellnessPrescriptionById(id) {
  const item = await getCoachAssignedWellnessPrescriptionRecordById(id);
  return item ? toCoachAssignedWellnessPrescriptionPublic(item) : null;
}

async function queryCoachAssignedWellnessPrescriptionsByUserId(userId) {
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

async function listCoachAssignedWellnessPrescriptionsByUserId(userId) {
  const items = await queryCoachAssignedWellnessPrescriptionsByUserId(userId);
  return items
    .map((row) => toCoachAssignedWellnessPrescriptionPublic(row))
    .filter(Boolean);
}

async function deleteCoachAssignedWellnessPrescription(id) {
  const record = await getCoachAssignedWellnessPrescriptionRecordById(id);
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

  return toCoachAssignedWellnessPrescriptionPublic(record);
}

async function isWellnessPrescriptionCatalogReferenced(prescriptionId) {
  const slug = String(prescriptionId || "").trim();
  if (!slug) return false;

  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        ProjectionExpression: "#sourcePrescriptionIds",
        ExpressionAttributeNames: { "#sourcePrescriptionIds": "sourcePrescriptionIds" },
        ExclusiveStartKey: lastKey,
        Limit: 100,
      })
    );
    for (const item of Items || []) {
      const ids = Array.isArray(item.sourcePrescriptionIds)
        ? item.sourcePrescriptionIds
        : [];
      if (ids.some((id) => String(id) === slug)) return true;
    }
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return false;
}

module.exports = {
  createCoachAssignedWellnessPrescription,
  getCoachAssignedWellnessPrescriptionById,
  getCoachAssignedWellnessPrescriptionRecordById,
  listCoachAssignedWellnessPrescriptionsByUserId,
  deleteCoachAssignedWellnessPrescription,
  isWellnessPrescriptionCatalogReferenced,
  toCoachAssignedWellnessPrescriptionPublic,
  normalizeDate,
  normalizeCreatedByRole,
};
