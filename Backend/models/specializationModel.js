const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");

const TABLE = "Specialization";
const ALLOWED_STATUS = new Set(["active", "inactive"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeTitle(title) {
  return String(title || "").trim();
}

function buildTitleKey(title) {
  const normalized = normalizeTitle(title).toLowerCase();
  return normalized || "";
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

async function getSpecializationByTitleKey(titleKey) {
  if (!titleKey) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "TitleKeyIndex",
      KeyConditionExpression: "titleKey = :titleKey",
      ExpressionAttributeValues: { ":titleKey": titleKey },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function createSpecialization({ title, description = null, status = "active" }) {
  const normalizedTitle = normalizeTitle(title);
  const titleKey = buildTitleKey(normalizedTitle);

  if (!normalizedTitle) throw new Error("title is required");

  const existing = await getSpecializationByTitleKey(titleKey);
  if (existing) {
    const err = new Error("specialization title already exists");
    err.code = "DUPLICATE_TITLE";
    throw err;
  }

  const now = new Date().toISOString();
  const item = {
    id: uuidv4(),
    title: normalizedTitle,
    titleKey,
    description: description != null ? String(description).trim() || null : null,
    status: normalizeStatus(status),
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

  return withLegacyId(item);
}

async function getSpecializationById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function updateSpecialization(id, updates) {
  const current = await getSpecializationById(id);
  if (!current) {
    const err = new Error("Specialization not found");
    err.name = "NotFoundError";
    throw err;
  }

  const merged = { ...current };
  const entries = Object.entries(updates || {}).filter(([, v]) => v !== undefined);

  for (const [key, value] of entries) {
    if (key === "title") {
      merged.title = normalizeTitle(value);
      merged.titleKey = buildTitleKey(merged.title);
    } else if (key === "description") {
      merged.description = value != null ? String(value).trim() || null : null;
    } else if (key === "status") {
      merged.status = normalizeStatus(value);
    } else {
      merged[key] = value;
    }
  }

  if (updates.title !== undefined && merged.titleKey !== current.titleKey) {
    const duplicate = await getSpecializationByTitleKey(merged.titleKey);
    if (duplicate && duplicate.id !== id) {
      const err = new Error("specialization title already exists");
      err.code = "DUPLICATE_TITLE";
      throw err;
    }
  }

  const patchKeys = entries.map(([k]) => k);
  if (updates.title !== undefined && !patchKeys.includes("titleKey")) {
    patchKeys.push("titleKey");
  }

  if (patchKeys.length === 0) throw new Error("No valid fields provided for update");

  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const key of patchKeys) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    setExpr += `, #${key} = :${key}`;
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

  return withLegacyId(Attributes || null);
}

async function deleteSpecialization(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listSpecializations({ page = 1, limit = 20, status, search } = {}) {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(200, Math.max(1, Number(limit) || 20));
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedSearch = String(search || "").trim().toLowerCase();

  const filters = [];
  const names = {};
  const values = {};

  if (normalizedStatus) {
    filters.push("#status = :status");
    names["#status"] = "status";
    values[":status"] = normalizedStatus;
  }
  if (normalizedSearch) {
    filters.push("(contains(#title, :search) OR contains(#description, :search))");
    names["#title"] = "title";
    names["#description"] = "description";
    values[":search"] = normalizedSearch;
  }

  const params = { TableName: TABLE };
  if (filters.length > 0) {
    params.FilterExpression = filters.join(" AND ");
    params.ExpressionAttributeNames = names;
    params.ExpressionAttributeValues = values;
  }

  const rows = [];
  let lastKey;
  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        ...params,
        ExclusiveStartKey: lastKey,
      })
    );
    if (Array.isArray(Items) && Items.length) rows.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  rows.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / safeLimit));
  const start = (safePage - 1) * safeLimit;
  const specializations = rows.slice(start, start + safeLimit).map(withLegacyId);

  return {
    specializations,
    pagination: { page: safePage, limit: safeLimit, total, pages },
  };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  normalizeStatus,
  normalizeTitle,
  buildTitleKey,
  createSpecialization,
  getSpecializationById,
  getSpecializationByTitleKey,
  updateSpecialization,
  deleteSpecialization,
  listSpecializations,
};
