const { v4: uuidv4 } = require("uuid");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const { queryPartition } = require("../utils/dynamoList");
const { toNumberOrNull } = require("../utils/healthProgressHelpers");

const TABLE = "HealthProgressMetabolicMetric";

function buildMetabolicMetricItem(input, { id, now }) {
  return {
    id: id || uuidv4(),
    userId: String(input.userId || "").trim(),
    metricType: String(input.metricType || "").trim(),
    gender: input.gender ? String(input.gender) : null,
    age: toNumberOrNull(input.age),
    heightCm: toNumberOrNull(input.heightCm),
    weightKg: toNumberOrNull(input.weightKg),
    neckCm: toNumberOrNull(input.neckCm),
    waistCm: toNumberOrNull(input.waistCm),
    hipCm: toNumberOrNull(input.hipCm),
    activityLevel: input.activityLevel ? String(input.activityLevel) : null,
    bodyFatGoal: toNumberOrNull(input.bodyFatGoal),
    bmi: toNumberOrNull(input.bmi),
    bmiCategory: input.bmiCategory ? String(input.bmiCategory) : null,
    bmiCategoryColor: input.bmiCategoryColor ? String(input.bmiCategoryColor) : null,
    bmr: toNumberOrNull(input.bmr),
    tdee: toNumberOrNull(input.tdee),
    tdeeTiers: Array.isArray(input.tdeeTiers) ? input.tdeeTiers : null,
    bodyFatPercent: toNumberOrNull(input.bodyFatPercent),
    leanMuscleMassPercent: toNumberOrNull(input.leanMuscleMassPercent),
    waistHeightRatio: toNumberOrNull(input.waistHeightRatio),
    estimatedVisceralFat: toNumberOrNull(input.estimatedVisceralFat),
    visceralFatPercent: toNumberOrNull(input.visceralFatPercent),
    visceralFatRisk: input.visceralFatRisk ? String(input.visceralFatRisk) : null,
    triglycerides: toNumberOrNull(input.triglycerides),
    ggt: toNumberOrNull(input.ggt),
    fli: toNumberOrNull(input.fli),
    fliRiskLabel: input.fliRiskLabel ? String(input.fliRiskLabel) : null,
    fliRiskColor: input.fliRiskColor ? String(input.fliRiskColor) : null,
    enteredByCoachId: input.enteredByCoachId ? String(input.enteredByCoachId) : null,
    recordedAt: input.recordedAt || now,
    createdAt: now,
    updatedAt: now,
  };
}

async function createMetabolicMetricLog(input) {
  const now = new Date().toISOString();
  const item = buildMetabolicMetricItem(input, { now });
  if (!item.userId) throw new Error("userId is required");
  if (!item.metricType) throw new Error("metricType is required");
  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );
  return item;
}

async function getMetabolicMetricLogById(id) {
  if (!id) return null;
  const { Item } = await docClient.send(
    new GetCommand({ TableName: TABLE, Key: { id } })
  );
  return Item || null;
}

async function listMetabolicMetricLogsByUser(
  userId,
  { page = 1, limit = 50, metricType } = {}
) {
  if (!userId) {
    return { items: [], pagination: { page: 1, limit, total: 0, pages: 1 } };
  }

  const result = await queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page,
    limit: metricType ? Math.min(200, limit * 4) : limit,
    scanIndexForward: false,
  });

  let items = result.items;
  if (metricType) {
    items = items.filter((item) => item.metricType === metricType);
    const start = (page - 1) * limit;
    const slice = items.slice(start, start + limit);
    return {
      items: slice,
      pagination: {
        page,
        limit,
        total: items.length,
        pages: Math.max(1, Math.ceil(items.length / limit)),
      },
    };
  }

  return result;
}

async function listAllMetabolicMetricLogsByUser(userId, { limit = 200 } = {}) {
  if (!userId) return [];
  const result = await queryPartition({
    tableName: TABLE,
    indexName: "UserIdRecordedAtIndex",
    partitionKeyName: "userId",
    partitionKeyValue: String(userId),
    page: 1,
    limit,
    scanIndexForward: false,
  });
  return result.items || [];
}

function toPublicMetabolicMetricLog(item) {
  if (!item) return null;
  return {
    ...item,
    _id: item.id,
  };
}

module.exports = {
  TABLE,
  buildMetabolicMetricItem,
  createMetabolicMetricLog,
  getMetabolicMetricLogById,
  listMetabolicMetricLogsByUser,
  listAllMetabolicMetricLogsByUser,
  toPublicMetabolicMetricLog,
};
