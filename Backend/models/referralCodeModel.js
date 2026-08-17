const { PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../config/db");
const {
  generateReferralCodeForEntity,
  normalizeReferralCode,
} = require("../utils/referralCode");

const TABLE = "ReferralCode";

const REFERRAL_ENTITY_TYPES = new Set(["wellness_coach", "assistant_wellness_coach", "user"]);

function normalizeEntityType(value) {
  const next = String(value || "").toLowerCase().trim();
  if (!REFERRAL_ENTITY_TYPES.has(next)) {
    throw new Error(`entityType must be one of: ${[...REFERRAL_ENTITY_TYPES].join(", ")}`);
  }
  return next;
}

async function getReferralCodeRecord(referralCode) {
  const code = normalizeReferralCode(referralCode);
  if (!code) return null;

  const { Item } = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { referralCode: code },
    })
  );

  return Item || null;
}

async function registerReferralCode({ referralCode, entityType, entityId, ownerCoachId }) {
  const code = normalizeReferralCode(referralCode);
  const normalizedType = normalizeEntityType(entityType);
  const normalizedEntityId = String(entityId || "").trim();
  const normalizedOwnerCoachId = String(ownerCoachId || "").trim();

  if (!code) throw new Error("referralCode is required");
  if (!normalizedEntityId) throw new Error("entityId is required");
  if (!normalizedOwnerCoachId) throw new Error("ownerCoachId is required");

  const now = new Date().toISOString();
  const item = {
    referralCode: code,
    entityType: normalizedType,
    entityId: normalizedEntityId,
    ownerCoachId: normalizedOwnerCoachId,
    createdAt: now,
    updatedAt: now,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      ConditionExpression: "attribute_not_exists(referralCode)",
    })
  );

  return item;
}

async function updateReferralCodeOwnerCoachId(referralCode, ownerCoachId) {
  const code = normalizeReferralCode(referralCode);
  const normalizedOwnerCoachId = String(ownerCoachId || "").trim();
  if (!code) throw new Error("referralCode is required");
  if (!normalizedOwnerCoachId) throw new Error("ownerCoachId is required");

  const { Attributes } = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { referralCode: code },
      UpdateExpression: "SET ownerCoachId = :ownerCoachId, updatedAt = :updatedAt",
      ExpressionAttributeValues: {
        ":ownerCoachId": normalizedOwnerCoachId,
        ":updatedAt": new Date().toISOString(),
      },
      ConditionExpression: "attribute_exists(referralCode)",
      ReturnValues: "ALL_NEW",
    })
  );

  return Attributes || null;
}

async function deleteReferralCodeRecord(referralCode) {
  const code = normalizeReferralCode(referralCode);
  if (!code) return;

  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { referralCode: code },
      ConditionExpression: "attribute_exists(referralCode)",
    })
  );
}

/**
 * Generate a unique referral code.
 * @param {{ entityType?: string, maxAttempts?: number }} [options]
 *   entityType wellness_coach → IRW-WC-NNN; assistant_wellness_coach → IRW-AWC-NNN; else random.
 */
async function generateUniqueReferralCode(options = {}) {
  const maxAttempts = options.maxAttempts ?? 12;
  const entityType = options.entityType || null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    // Widen the staff numeric suffix as attempts fail — the 3-digit space is small.
    const candidate = generateReferralCodeForEntity(entityType, {
      digits: 3 + Math.floor(attempt / 4),
    });
    const existing = await getReferralCodeRecord(candidate);
    if (!existing) return candidate;
  }
  throw new Error("Unable to generate a unique referral code");
}

/**
 * Ensure an entity has a referral code on its record and in the ReferralCode registry.
 * Generates a new code when missing; re-registers when the registry row is absent.
 */
async function ensureEntityReferralCode({
  tableName,
  entityType,
  entityId,
  ownerCoachId,
  referralCode,
}) {
  const normalizedEntityId = String(entityId || "").trim();
  const normalizedOwnerCoachId = String(ownerCoachId || "").trim();
  if (!tableName) throw new Error("tableName is required");
  if (!normalizedEntityId) throw new Error("entityId is required");
  if (!normalizedOwnerCoachId) throw new Error("ownerCoachId is required");

  let code = normalizeReferralCode(referralCode);

  if (!code) {
    code = await generateUniqueReferralCode({ entityType });
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: normalizedEntityId },
        UpdateExpression: "SET referralCode = :referralCode, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":referralCode": code,
          ":updatedAt": new Date().toISOString(),
        },
        ConditionExpression: "attribute_exists(id)",
      })
    );
  }

  const registryRow = await getReferralCodeRecord(code);
  if (!registryRow) {
    try {
      await registerReferralCode({
        referralCode: code,
        entityType,
        entityId: normalizedEntityId,
        ownerCoachId: normalizedOwnerCoachId,
      });
    } catch (err) {
      if (err?.name !== "ResourceNotFoundException") {
        throw err;
      }
    }
  }

  return code;
}

module.exports = {
  TABLE,
  REFERRAL_ENTITY_TYPES,
  normalizeReferralCode,
  normalizeEntityType,
  getReferralCodeRecord,
  registerReferralCode,
  updateReferralCodeOwnerCoachId,
  deleteReferralCodeRecord,
  generateUniqueReferralCode,
  ensureEntityReferralCode,
};
