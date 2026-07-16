const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { v4: uuidv4 } = require("uuid");
const { docClient } = require("../config/db");
const {
  normalizeEmail,
  normalizePhone,
  normalizeCountryCode,
  buildPhoneKey,
} = require("./userModel");
const { normalizeNullableMediaField, resolvePublicUrl } = require("../utils/s3");
const { toPublicProfile } = require("../utils/toPublicProfile");
const {
  registerReferralCode,
  generateUniqueReferralCode,
} = require("./referralCodeModel");
const {
  listByPartitionKey,
  appendFilter,
  sortByCreatedAtDesc,
} = require("../utils/dynamoList");

const TABLE = "WellnessCoach";
const ALLOWED_STATUS = new Set(["active", "inactive"]);
const ALLOWED_APPROVAL_STATUS = new Set(["pending", "approved", "rejected"]);

function normalizeStatus(value, fallback = "active") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_STATUS.has(next) ? next : fallback;
}

function normalizeApprovalStatus(value, fallback = "approved") {
  const next = String(value || fallback).toLowerCase().trim();
  return ALLOWED_APPROVAL_STATUS.has(next) ? next : fallback;
}

/** Missing attributes count as visible so older rows stay listed until backfill. */
function normalizeVisibleFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return Boolean(fallback);
}

function visibilityFilterParts(field, wantVisible) {
  if (wantVisible === undefined || wantVisible === null) return null;
  const visible = normalizeVisibleFlag(wantVisible, true);
  const nameKey = `#${field}`;
  const trueKey = `:${field}True`;
  const falseKey = `:${field}False`;
  if (visible) {
    return {
      expression: `(attribute_not_exists(${nameKey}) OR ${nameKey} = ${trueKey})`,
      exprNames: { [nameKey]: field },
      exprValues: { [trueKey]: true },
    };
  }
  return {
    expression: `${nameKey} = ${falseKey}`,
    exprNames: { [nameKey]: field },
    exprValues: { [falseKey]: false },
  };
}

function isVisibleForPlatform(item, platform) {
  const channel = String(platform || "").toLowerCase().trim();
  if (channel === "web") return normalizeVisibleFlag(item?.webVisible, true);
  if (channel === "app") return normalizeVisibleFlag(item?.appVisible, true);
  return true;
}

function withLegacyId(item) {
  if (!item) return null;
  return { ...item, _id: item.id };
}

function toPublicWellnessCoach(coach) {
  const row = withLegacyId(coach);
  if (!row) return null;
  const pub = toPublicProfile(row);
  if (pub.profileImage) pub.profileImage = resolvePublicUrl(pub.profileImage);
  return pub;
}

function buildCoachItem(input, { id, now } = {}) {
  const phoneCountryCode = normalizeCountryCode(input.phoneCountryCode);
  const phone = normalizePhone(input.phone);
  const email = normalizeEmail(input.email);

  const item = {
    id: id || uuidv4(),
    name: String(input.name || "").trim(),
    email,
    phoneCountryCode,
    phone,
    phoneKey: buildPhoneKey(phoneCountryCode, phone),
    profileImage:
      input.profileImage != null
        ? normalizeNullableMediaField(input.profileImage, "profileImage")
        : null,
    bio: input.bio != null ? String(input.bio).trim() || null : null,
    specializationId:
      input.specializationId != null ? String(input.specializationId).trim() || null : null,
    country: input.country != null ? String(input.country).trim() || null : null,
    state: input.state != null ? String(input.state).trim() || null : null,
    city: input.city != null ? String(input.city).trim() || null : null,
    password: input.password != null ? String(input.password) : null,
    fcmId: input.fcmId != null ? String(input.fcmId).trim() || null : null,
    status: normalizeStatus(input.status),
    approvalStatus: normalizeApprovalStatus(input.approvalStatus, input._defaultApproval || "approved"),
    webVisible: normalizeVisibleFlag(input.webVisible, true),
    appVisible: normalizeVisibleFlag(input.appVisible, true),
    referralCode: input.referralCode != null ? String(input.referralCode).trim().toUpperCase() || null : null,
    createdAt: now,
    updatedAt: now,
  };

  // Omit roleId when null — keeps GSI-friendly patterns consistent with Admin.
  const roleId =
    input.roleId != null && String(input.roleId).trim() ? String(input.roleId).trim() : null;
  if (roleId) item.roleId = roleId;

  if (
    input.permissionOverrides != null &&
    typeof input.permissionOverrides === "object" &&
    !Array.isArray(input.permissionOverrides) &&
    Object.keys(input.permissionOverrides).length > 0
  ) {
    item.permissionOverrides = input.permissionOverrides;
  }

  return item;
}

function sanitizeUpdateField(key, value) {
  if (key === "email") return normalizeEmail(value);
  if (key === "phone") return normalizePhone(value);
  if (key === "phoneCountryCode") return normalizeCountryCode(value);
  if (key === "status") return normalizeStatus(value);
  if (key === "approvalStatus") return normalizeApprovalStatus(value);
  if (key === "webVisible" || key === "appVisible") return normalizeVisibleFlag(value, true);
  if (key === "specializationId") {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  if (key === "profileImage") {
    return normalizeNullableMediaField(value, "profileImage");
  }
  if (["name", "bio", "country", "state", "city"].includes(key)) {
    const s = value == null ? "" : String(value).trim();
    return s || null;
  }
  if (key === "password") {
    return value != null ? String(value) : null;
  }
  if (key === "fcmId") {
    return value != null ? String(value).trim() || null : null;
  }
  if (key === "otp") {
    return value != null ? (value === null ? null : String(value)) : null;
  }
  if (key === "otpExpire") {
    return value != null && value !== "" ? String(value) : null;
  }
  if (key === "roleId") {
    if (value == null || value === "") return null;
    return String(value).trim() || null;
  }
  if (key === "permissionOverrides") {
    if (value == null) return null;
    if (typeof value !== "object" || Array.isArray(value)) return null;
    return value;
  }
  return value;
}

async function getWellnessCoachByEmail(email) {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "EmailIndex",
      KeyConditionExpression: "email = :email",
      ExpressionAttributeValues: { ":email": normalized },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function getWellnessCoachByPhone(phoneCountryCode, phone) {
  const phoneKey = buildPhoneKey(phoneCountryCode, phone);
  if (!phoneKey) return null;
  const { Items } = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "PhoneKeyIndex",
      KeyConditionExpression: "phoneKey = :phoneKey",
      ExpressionAttributeValues: { ":phoneKey": phoneKey },
      Limit: 1,
    })
  );
  return withLegacyId(Items?.[0] || null);
}

async function createWellnessCoach(fields) {
  const now = new Date().toISOString();
  const referralCode = fields.referralCode || (await generateUniqueReferralCode());
  const item = buildCoachItem({ ...fields, referralCode }, { now });

  if (!item.name) throw new Error("name is required");
  if (!item.email) throw new Error("email is required");
  if (!item.phone) throw new Error("phone is required");
  if (!item.referralCode) throw new Error("referralCode is required");

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(id)",
    })
  );

  await registerReferralCode({
    referralCode: item.referralCode,
    entityType: "wellness_coach",
    entityId: item.id,
    ownerCoachId: item.id,
  });

  return toPublicWellnessCoach(item);
}

async function getWellnessCoachRecordById(id) {
  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { id },
    })
  );
  return withLegacyId(Item || null);
}

async function getWellnessCoachById(id) {
  const item = await getWellnessCoachRecordById(id);
  return item ? toPublicWellnessCoach(item) : null;
}

async function updateWellnessCoach(id, updates) {
  const blocked = new Set(["id", "_id", "createdAt", "phoneKey"]);
  const entries = Object.entries(updates || {})
    .filter(([k, v]) => !blocked.has(k) && v !== undefined)
    .map(([k, v]) => [k, sanitizeUpdateField(k, v)]);

  if (entries.length === 0) throw new Error("No valid fields provided for update");

  const current = await getWellnessCoachRecordById(id);
  if (!current) {
    const err = new Error("Wellness coach not found");
    err.name = "NotFoundError";
    throw err;
  }

  const merged = { ...current };
  const removeAttrs = [];
  for (const [k, v] of entries) {
    // roleId / permissionOverrides: null means REMOVE the attribute.
    if ((k === "roleId" || k === "permissionOverrides") && (v === null || v === "")) {
      removeAttrs.push(k);
      delete merged[k];
      continue;
    }
    merged[k] = v;
  }

  if (updates.phone !== undefined || updates.phoneCountryCode !== undefined) {
    merged.phoneKey = buildPhoneKey(merged.phoneCountryCode, merged.phone);
  }

  const patchKeys = entries
    .map(([k]) => k)
    .filter((k) => !removeAttrs.includes(k));
  if (patchKeys.includes("phone") || patchKeys.includes("phoneCountryCode")) {
    patchKeys.push("phoneKey");
  }

  const uniquePatch = [...new Set(patchKeys)];
  const exprNames = {};
  const exprValues = { ":updatedAt": new Date().toISOString() };
  let setExpr = "SET updatedAt = :updatedAt";

  for (const key of uniquePatch) {
    exprNames[`#${key}`] = key;
    exprValues[`:${key}`] = merged[key];
    setExpr += `, #${key} = :${key}`;
  }

  let updateExpression = setExpr;
  if (removeAttrs.length > 0) {
    for (const key of removeAttrs) {
      exprNames[`#${key}`] = key;
    }
    updateExpression += ` REMOVE ${removeAttrs.map((k) => `#${k}`).join(", ")}`;
  }

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { id },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ConditionExpression: "attribute_exists(id)",
      ReturnValues: "ALL_NEW",
    })
  );

  return toPublicWellnessCoach(Attributes || null);
}

async function countCoachesByRoleId(roleId) {
  if (!roleId) return 0;
  let total = 0;
  let lastKey;
  do {
    const { Count, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: "roleId = :roleId",
        ExpressionAttributeValues: { ":roleId": roleId },
        Select: "COUNT",
        ExclusiveStartKey: lastKey,
      })
    );
    total += Count || 0;
    lastKey = LastEvaluatedKey;
  } while (lastKey);
  return total;
}

async function deleteWellnessCoach(id) {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { id },
      ConditionExpression: "attribute_exists(id)",
    })
  );
}

async function listWellnessCoaches({
  page = 1,
  limit = 20,
  status,
  approvalStatus,
  search,
  platform,
  webVisible,
  appVisible,
} = {}) {
  const normalizedStatus = status ? normalizeStatus(status, "") : "";
  const normalizedApproval = approvalStatus ? normalizeApprovalStatus(approvalStatus, "") : "";
  const searchFields = ["name", "email", "phone", "specializationId"];
  const searchTerm = String(search || "").trim();
  const channel = String(platform || "").toLowerCase().trim();
  const wantWebVisible =
    webVisible !== undefined
      ? webVisible
      : channel === "web"
        ? true
        : undefined;
  const wantAppVisible =
    appVisible !== undefined
      ? appVisible
      : channel === "app"
        ? true
        : undefined;

  let filterExpression = null;
  const exprNames = {};
  const exprValues = {};
  if (normalizedApproval) {
    exprNames["#approvalStatus"] = "approvalStatus";
    exprValues[":approvalStatus"] = normalizedApproval;
    filterExpression = appendFilter(filterExpression, "#approvalStatus = :approvalStatus");
  }
  for (const part of [
    visibilityFilterParts("webVisible", wantWebVisible),
    visibilityFilterParts("appVisible", wantAppVisible),
  ]) {
    if (!part) continue;
    Object.assign(exprNames, part.exprNames);
    Object.assign(exprValues, part.exprValues);
    filterExpression = appendFilter(filterExpression, part.expression);
  }

  // When a search term is present, listByPartitionKey drops the DynamoDB
  // FilterExpression and filters in memory, so fold visibility into searchFn.
  const searchFn = searchTerm
    ? (item, term) => {
        if (normalizedApproval && normalizeApprovalStatus(item.approvalStatus, "") !== normalizedApproval) {
          return false;
        }
        if (wantWebVisible !== undefined && normalizeVisibleFlag(item.webVisible, true) !== normalizeVisibleFlag(wantWebVisible, true)) {
          return false;
        }
        if (wantAppVisible !== undefined && normalizeVisibleFlag(item.appVisible, true) !== normalizeVisibleFlag(wantAppVisible, true)) {
          return false;
        }
        return searchFields.some((field) =>
          String(item[field] || "").toLowerCase().includes(term)
        );
      }
    : undefined;

  const { items, pagination } = await listByPartitionKey({
    tableName: TABLE,
    indexName: "StatusCreatedAtIndex",
    partitionKeyValue: normalizedStatus || undefined,
    filterExpression,
    exprNames,
    exprValues,
    search: searchTerm || null,
    searchFn,
    scanIndexForward: false,
    page,
    limit,
    maxLimit: 200,
    sortFn: sortByCreatedAtDesc,
  });

  return {
    wellnessCoaches: items.map((row) => toPublicWellnessCoach(row)),
    pagination,
  };
}

async function countAllWellnessCoaches() {
  let total = 0;
  for (const statusValue of ["active", "inactive"]) {
    let lastKey;
    do {
      const { Count, LastEvaluatedKey } = await docClient.send(
        new QueryCommand({
          TableName: TABLE,
          IndexName: "StatusCreatedAtIndex",
          KeyConditionExpression: "#status = :status",
          ExpressionAttributeNames: { "#status": "status" },
          ExpressionAttributeValues: { ":status": statusValue },
          Select: "COUNT",
          ExclusiveStartKey: lastKey,
        })
      );
      total += Count || 0;
      lastKey = LastEvaluatedKey;
    } while (lastKey);
  }
  return total;
}

function normalizeVisibleFlag(value, fallback = true) {
  if (value === undefined || value === null || value === "") return Boolean(fallback);
  if (typeof value === "boolean") return value;
  const s = String(value).toLowerCase().trim();
  if (s === "true" || s === "1" || s === "yes") return true;
  if (s === "false" || s === "0" || s === "no") return false;
  return Boolean(fallback);
}

function visibilityFilterParts(field, wantVisible) {
  if (wantVisible === undefined || wantVisible === null) return null;
  const visible = normalizeVisibleFlag(wantVisible, true);
  const nameKey = `#${field}`;
  const trueKey = `:${field}True`;
  const falseKey = `:${field}False`;
  if (visible) {
    return {
      expression: `(attribute_not_exists(${nameKey}) OR ${nameKey} = ${trueKey})`,
      exprNames: { [nameKey]: field },
      exprValues: { [trueKey]: true },
    };
  }
  return {
    expression: `${nameKey} = ${falseKey}`,
    exprNames: { [nameKey]: field },
    exprValues: { [falseKey]: false },
  };
}

module.exports = {
  TABLE,
  ALLOWED_STATUS,
  ALLOWED_APPROVAL_STATUS,
  normalizeStatus,
  normalizeApprovalStatus,
  normalizeVisibleFlag,
  isVisibleForPlatform,
  visibilityFilterParts,
  buildCoachItem,
  createWellnessCoach,
  getWellnessCoachById,
  getWellnessCoachRecordById,
  getWellnessCoachByEmail,
  getWellnessCoachByPhone,
  updateWellnessCoach,
  deleteWellnessCoach,
  listWellnessCoaches,
  countAllWellnessCoaches,
  countCoachesByRoleId,
  toPublicWellnessCoach,
};
