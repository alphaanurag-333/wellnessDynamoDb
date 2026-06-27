const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");

const TABLE = "UserMedicalCondition";

function toBool(value) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return false;
  const s = String(value).trim().toLowerCase();
  return s === "true" || s === "1" || s === "yes";
}

function buildMedicalConditionItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    hasConditions: toBool(input.hasConditions),
    conditionsDetails: input.conditionsDetails ? String(input.conditionsDetails) : null,
    conditionSince: input.conditionSince ? String(input.conditionSince) : null,
    onMedication: toBool(input.onMedication),
    medicationDetails: input.medicationDetails ? String(input.medicationDetails) : null,
    pastSurgery: toBool(input.pastSurgery),
    surgeryDetails: input.surgeryDetails ? String(input.surgeryDetails) : null,
    hasRestrictions: toBool(input.hasRestrictions),
    restrictionsDetails: input.restrictionsDetails ? String(input.restrictionsDetails) : null,
    createdAt: now,
    updatedAt: now,
  };
}

async function createMedicalCondition(input) {
  const now = new Date().toISOString();
  const item = buildMedicalConditionItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getMedicalConditionById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listMedicalConditionsByUser(userId, { page = 1, limit = 20 } = {}) {
  if (!userId) return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  return queryPartition({
    tableName: TABLE,
    indexName: "UserIdCreatedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit,
  });
}

async function getLatestMedicalConditionForUser(userId) {
  const result = await listMedicalConditionsByUser(userId, { page: 1, limit: 1 });
  return result.items[0] || null;
}

function toPublicMedicalCondition(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

module.exports = {
  TABLE,
  buildMedicalConditionItem,
  createMedicalCondition,
  getMedicalConditionById,
  listMedicalConditionsByUser,
  getLatestMedicalConditionForUser,
  toPublicMedicalCondition,
};
