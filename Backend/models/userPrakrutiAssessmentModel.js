const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const { normalizePrakrutiType, prakrutiTypeLabel } = require("../utils/prakrutiConstants");
const {
  getActivePrakrutiThingsToAvoidByIds,
  normalizeThingToAvoidIds,
  validateActiveThingToAvoidIds,
} = require("./prakrutiThingToAvoidModel");
const { listActivePrakrutiRecommendationsByType } = require("./prakrutiRecommendationModel");

const TABLE = "UserPrakrutiAssessment";
const CREATED_BY_ROLES = new Set(["wellness_coach", "assistant_wellness_coach"]);

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function normalizeCreatedByRole(value, fallback = "wellness_coach") {
  const next = String(value || fallback).trim().toLowerCase();
  return CREATED_BY_ROLES.has(next) ? next : fallback;
}

function normalizePrakrutiTypeField(value) {
  const type = normalizePrakrutiType(value);
  if (!type) {
    const err = new Error("prakrutiType is required and must be a valid type");
    err.name = "ValidationError";
    throw err;
  }
  return type;
}

function toUserPrakrutiAssessmentPublic(item, thingsToAvoid = null, recommendations = null) {
  const row = withLegacyId(item);
  if (!row) return null;
  const thingToAvoidIds = normalizeThingToAvoidIds(row.thingToAvoidIds);
  const type = normalizePrakrutiType(row.prakrutiType) || row.prakrutiType;

  const base = {
    id: row.id,
    _id: row._id,
    userId: row.userId,
    coachId: row.coachId,
    prakrutiType: type,
    prakrutiTypeLabel: prakrutiTypeLabel(type),
    thingToAvoidIds,
    createdByRole: normalizeCreatedByRole(row.createdByRole),
    createdById: row.createdById,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };

  if (thingsToAvoid !== null) {
    base.thingsToAvoid = thingsToAvoid;
    base.thingsToAvoidTitles = thingsToAvoid.map((t) => t.title);
  }
  if (recommendations !== null) {
    base.recommendations = recommendations;
    base.recommendationTitles = recommendations.map((r) => r.title);
  }

  return base;
}

async function enrichAssessmentPublic(item) {
  if (!item) return null;
  const thingToAvoidIds = normalizeThingToAvoidIds(item.thingToAvoidIds);
  const thingsToAvoid = thingToAvoidIds.length
    ? await getActivePrakrutiThingsToAvoidByIds(thingToAvoidIds)
    : [];
  const type = normalizePrakrutiType(item.prakrutiType);
  const recommendations = type ? await listActivePrakrutiRecommendationsByType(type) : [];
  return toUserPrakrutiAssessmentPublic(item, thingsToAvoid, recommendations);
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
        IndexName: "UserUpdatedAtIndex",
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

async function getLatestUserPrakrutiAssessmentByUserId(userId) {
  const items = await queryAssessmentsByUserId(userId);
  if (items.length === 0) return null;
  const sorted = [...items].sort((a, b) =>
    String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))
  );
  return sorted[0];
}

async function getUserPrakrutiAssessmentById(id) {
  const { Item } = await docClient.send(new GetCommand({ TableName: TABLE, Key: { id } }));
  if (!Item) return null;
  return enrichAssessmentPublic(Item);
}

async function upsertUserPrakrutiAssessment({
  userId,
  coachId,
  prakrutiType,
  thingToAvoidIds = [],
  createdByRole,
  createdById,
}) {
  const uid = String(userId || "").trim();
  if (!uid) {
    const err = new Error("userId is required");
    err.name = "ValidationError";
    throw err;
  }

  const type = normalizePrakrutiTypeField(prakrutiType);
  const validatedIds = await validateActiveThingToAvoidIds(thingToAvoidIds);
  const now = new Date().toISOString();

  const existing = await getLatestUserPrakrutiAssessmentByUserId(uid);

  if (existing) {
    const exprNames = {
      "#prakrutiType": "prakrutiType",
      "#thingToAvoidIds": "thingToAvoidIds",
      "#coachId": "coachId",
      "#createdByRole": "createdByRole",
      "#createdById": "createdById",
      "#updatedAt": "updatedAt",
    };
    const exprValues = {
      ":prakrutiType": type,
      ":thingToAvoidIds": validatedIds,
      ":coachId": String(coachId || "").trim(),
      ":createdByRole": normalizeCreatedByRole(createdByRole),
      ":createdById": String(createdById || "").trim(),
      ":updatedAt": now,
    };

    const { Attributes } = await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: existing.id },
        UpdateExpression:
          "SET #prakrutiType = :prakrutiType, #thingToAvoidIds = :thingToAvoidIds, #coachId = :coachId, #createdByRole = :createdByRole, #createdById = :createdById, #updatedAt = :updatedAt",
        ExpressionAttributeNames: exprNames,
        ExpressionAttributeValues: exprValues,
        ConditionExpression: "attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      })
    );
    return enrichAssessmentPublic(Attributes);
  }

  const item = {
    id: uuidv4(),
    userId: uid,
    coachId: String(coachId || "").trim(),
    prakrutiType: type,
    thingToAvoidIds: validatedIds,
    createdByRole: normalizeCreatedByRole(createdByRole),
    createdById: String(createdById || "").trim(),
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

module.exports = {
  CREATED_BY_ROLES,
  normalizeCreatedByRole,
  normalizePrakrutiTypeField,
  toUserPrakrutiAssessmentPublic,
  enrichAssessmentPublic,
  getLatestUserPrakrutiAssessmentByUserId,
  getUserPrakrutiAssessmentById,
  upsertUserPrakrutiAssessment,
  queryAssessmentsByUserId,
};
