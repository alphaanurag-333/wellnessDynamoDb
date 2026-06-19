/**
 * User tier, referral registry, ParentCoachIndex GSI, and referral code backfill.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { docClient } = require("../../config/db");
const {
  backupTable,
  addGlobalSecondaryIndex,
  tableHasIndex,
  describeTable,
  scanTable,
  client,
} = require("../lib/helpers");
const { generateReferralCode } = require("../../utils/referralCode");
const { getReferralCodeRecord, registerReferralCode } = require("../../models/referralCodeModel");

const USER_TABLE = "User";
const REFERRAL_TABLE = "ReferralCode";

const PARENT_COACH_INDEX = {
  IndexName: "ParentCoachIndex",
  KeySchema: [
    { AttributeName: "parentCoachId", KeyType: "HASH" },
    { AttributeName: "createdAt", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
  _attributeTypes: {
    parentCoachId: "S",
    createdAt: "S",
  },
};

async function ensureReferralCodeTable() {
  try {
    await describeTable(REFERRAL_TABLE);
    console.log(`[${REFERRAL_TABLE}] Table exists — skip create.`);
    return false;
  } catch (err) {
    if (err.name !== "ResourceNotFoundException") throw err;
  }

  await client.send(
    new CreateTableCommand({
      TableName: REFERRAL_TABLE,
      KeySchema: [{ AttributeName: "referralCode", KeyType: "HASH" }],
      AttributeDefinitions: [{ AttributeName: "referralCode", AttributeType: "S" }],
      BillingMode: "PAY_PER_REQUEST",
    })
  );

  console.log(`[${REFERRAL_TABLE}] Table created.`);
  return true;
}

async function backfillUserTier(items) {
  let updated = 0;
  for (const item of items) {
    if (item.userTier) continue;
    await docClient.send(
      new UpdateCommand({
        TableName: USER_TABLE,
        Key: { id: item.id },
        UpdateExpression: "SET userTier = :userTier, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":userTier": "seek",
          ":updatedAt": new Date().toISOString(),
        },
      })
    );
    updated += 1;
  }
  return updated;
}

async function backfillEntityReferralCode(tableName, entityType, resolveOwnerCoachId) {
  const items = await scanTable(tableName);
  let updated = 0;

  for (const item of items) {
    if (item.referralCode) {
      const existing = await getReferralCodeRecord(item.referralCode);
      if (!existing) {
        await registerReferralCode({
          referralCode: item.referralCode,
          entityType,
          entityId: item.id,
          ownerCoachId: resolveOwnerCoachId(item),
        });
      }
      continue;
    }

    let code = generateReferralCode();
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const taken = await getReferralCodeRecord(code);
      if (!taken) break;
      code = generateReferralCode();
    }

    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: item.id },
        UpdateExpression: "SET referralCode = :referralCode, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":referralCode": code,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );

    await registerReferralCode({
      referralCode: code,
      entityType,
      entityId: item.id,
      ownerCoachId: resolveOwnerCoachId(item),
    });

    updated += 1;
  }

  return updated;
}

async function migrateUserReferralAssignment() {
  const results = {};

  console.log(`[${REFERRAL_TABLE}] Ensuring registry table...`);
  results.referralTableCreated = await ensureReferralCodeTable();

  console.log(`[${USER_TABLE}] Checking ParentCoachIndex...`);
  const userTable = await describeTable(USER_TABLE);
  if (!tableHasIndex(userTable, PARENT_COACH_INDEX.IndexName)) {
    await backupTable(USER_TABLE);
    await addGlobalSecondaryIndex(USER_TABLE, PARENT_COACH_INDEX);
    results.parentCoachIndexAdded = true;
  } else {
    console.log(`[${USER_TABLE}] ParentCoachIndex already exists — skip.`);
    results.parentCoachIndexAdded = false;
  }

  console.log(`[${USER_TABLE}] Backfilling userTier=seek...`);
  const users = await scanTable(USER_TABLE);
  results.usersTierBackfilled = await backfillUserTier(users);

  console.log("[WellnessCoach] Backfilling referral codes...");
  results.wellnessCoachReferrals = await backfillEntityReferralCode(
    "WellnessCoach",
    "wellness_coach",
    (coach) => coach.id
  );

  console.log("[AssistantWellnessCoach] Backfilling referral codes...");
  results.assistantReferrals = await backfillEntityReferralCode(
    "AssistantWellnessCoach",
    "assistant_wellness_coach",
    (assistant) => String(assistant.wellnessCoachId || "").trim()
  );

  return results;
}

module.exports = {
  id: "05-user-referral-assignment",
  TABLES: [USER_TABLE, REFERRAL_TABLE, "WellnessCoach", "AssistantWellnessCoach"],
  migrateUserReferralAssignment,
};
