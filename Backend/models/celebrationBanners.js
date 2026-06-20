const {
    PutCommand,
    GetCommand,
    UpdateCommand,
    DeleteCommand,
  } = require("@aws-sdk/lib-dynamodb");
  const { v4: uuidv4 } = require("uuid");
  const { docClient } = require("../config/db");
  const { normalizeStoredMedia, resolvePublicUrl } = require("../utils/s3");
  const {
    listByPartitionKey,
    buildContainsFilter,
    appendFilter,
    sortByCreatedAtDesc,
  } = require("../utils/dynamoList");
  
  const TABLE = "CelebrationBanners";
  const STATUS = new Set(["active", "inactive"]);
  const TYPE = new Set(["birthday","championship"]);
  
  function normalizeStatus(value, fallback = "active") {
    const next = String(value || fallback).toLowerCase().trim();
    return STATUS.has(next) ? next : fallback;
  }
  
  function normalizeType(value, fallback = "birthday") {
    const next = String(value || fallback).toLowerCase().trim();
    return TYPE.has(next) ? next : fallback;
  }
  
  function withLegacyId(item) {
    if (!item) return null;
    return { ...item, _id: item.id };
  }

function normalizeImageField(value) {
  if (value == null || String(value).trim() === "") return "";
  const objectKey = normalizeStoredMedia(String(value).trim());
  if (!objectKey) {
    throw new Error("image must be a valid S3 object key (e.g. celebration-banners/photo.jpg)");
  }
  return objectKey;
}

function toPublicCelebrationBanner(banner) {
  const item = withLegacyId(banner);
  if (!item) return null;
  if (item.image) item.image = resolvePublicUrl(item.image);
  return item;
}

function sanitizeUpdateField(key, value) {
  if (key === "status") return normalizeStatus(value);
  if (key === "type") return normalizeType(value);
  if (key === "image") return normalizeImageField(value);
  if (["title", "startDate", "endDate"].includes(key)) return String(value).trim();
  return value;
}
  
  async function createCelebrationBanner({ title, image, type = "birthday", status = "active" , startDate, endDate}) {
    const now = new Date().toISOString();
    const item = {
      id: uuidv4(),
      title: String(title || "").trim(),
      type: normalizeType(type),
      image: normalizeImageField(image),
      status: normalizeStatus(status),
      startDate: String(startDate || "").trim(),
      endDate: String(endDate || "").trim(),
      createdAt: now,
      updatedAt: now,
    };
  
    await docClient.send(new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    }));
    return toPublicCelebrationBanner(item);
  }
  
  async function getCelebrationBannerRecordById(id) {
    const { Item } = await docClient.send(
      new GetCommand({
        TableName: TABLE,
        Key: { id },
      })
    );
    return withLegacyId(Item || null);
  }

  async function getCelebrationBannerById(id) {
    const item = await getCelebrationBannerRecordById(id);
    return item ? toPublicCelebrationBanner(item) : null;
  }
  
  async function updateCelebrationBanner(id, updates) {
  const blockedFields = new Set(["id", "_id", "createdAt"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blockedFields.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

    if (entries.length === 0) throw new Error("No valid fields provided for update");
  
    const exprNames = {};
    const exprValues = { ":updatedAt": new Date().toISOString() };
    let setExpr = "SET updatedAt = :updatedAt";
  
    for (const [k, v] of entries) {
      exprNames[`#${k}`] = k;
      exprValues[`:${k}`] = v;
      setExpr += `, #${k} = :${k}`;
    }
  
    const { Attributes } = await docClient.send(new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: setExpr,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    }));
    return toPublicCelebrationBanner(Attributes || null);
  }
  
  async function deleteCelebrationBanner(id) {
    await docClient.send(new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    }));
  }
  
  async function listCelebrationBanners({ page = 1, limit = 10, status, type, search } = {}) {
    const normalizedStatus = status ? normalizeStatus(status, "") : "";
    const normalizedType = type ? normalizeType(type, "") : "";
    const searchFilter = buildContainsFilter(["title"], search);
    let filterExpression = searchFilter.filterExpression;
    const exprNames = { ...searchFilter.exprNames };
    const exprValues = { ...searchFilter.exprValues };

    const useTypeIndex = Boolean(normalizedType);
    const indexName = useTypeIndex ? "TypeCreatedAtIndex" : "StatusCreatedAtIndex";
    const partitionKeyName = useTypeIndex ? "type" : "status";
    const partitionKeyValue = useTypeIndex
      ? normalizedType
      : normalizedStatus || undefined;

    if (normalizedStatus && partitionKeyName !== "status") {
      exprNames["#status"] = "status";
      exprValues[":status"] = normalizedStatus;
      filterExpression = appendFilter(filterExpression, "#status = :status");
    }

    const { items, pagination } = await listByPartitionKey({
      tableName: TABLE,
      indexName,
      partitionKeyName,
      partitionKeyValue,
      filterExpression,
      exprNames,
      exprValues,
      scanIndexForward: false,
      page,
      limit,
      maxLimit: 200,
      sortFn: sortByCreatedAtDesc,
    });

    return {
      celebrationBanners: items.map((row) => toPublicCelebrationBanner(row)),
      pagination,
    };
  }
  
  module.exports = {
    createCelebrationBanner,
    getCelebrationBannerById,
    getCelebrationBannerRecordById,
    updateCelebrationBanner,
    deleteCelebrationBanner,
    listCelebrationBanners,
  };
  