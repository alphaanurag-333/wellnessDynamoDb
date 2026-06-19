/**
 * Seed referral codes for all Wellness Coaches, Assistant Coaches, and Heal users.
 *
 * Usage (from Backend/):
 *   node script/seedReferralCodes.js
 */
require("dotenv").config();

const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { docClient, client } = require("../config/db");
const { scanTable, describeTable } = require("../migration/lib/helpers");
const { generateReferralCode } = require("../utils/referralCode");
const {
  getReferralCodeRecord,
  registerReferralCode,
  TABLE: REFERRAL_TABLE,
} = require("../models/referralCodeModel");
const { TABLE: WELLNESS_COACH_TABLE } = require("../models/wellnessCoachModel");
const { TABLE: ASSISTANT_TABLE } = require("../models/assistantWellnessCoachModel");
const { TABLE: USER_TABLE, normalizeUserTier } = require("../models/userModel");

async function ensureReferralCodeTable() {
  try {
    await describeTable(REFERRAL_TABLE);
    return;
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

  console.log(`Created ${REFERRAL_TABLE} table.`);
}

async function nextUniqueCode() {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const candidate = generateReferralCode();
    const taken = await getReferralCodeRecord(candidate);
    if (!taken) return candidate;
  }
  throw new Error("Could not allocate a unique referral code");
}

async function seedTableReferralCodes(tableName, entityType, resolveOwnerCoachId) {
  const items = await scanTable(tableName);
  let created = 0;
  let registered = 0;

  for (const item of items) {
    let code = item.referralCode ? String(item.referralCode).trim().toUpperCase() : "";

    if (!code) {
      code = await nextUniqueCode();
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
      created += 1;
      console.log(`  [${tableName}] ${item.id} → ${code}`);
    }

    const ownerCoachId = resolveOwnerCoachId(item);
    if (!ownerCoachId) {
      console.warn(`  [${tableName}] skip registry for ${item.id} — missing ownerCoachId`);
      continue;
    }

    const existing = await getReferralCodeRecord(code);
    if (!existing) {
      await registerReferralCode({
        referralCode: code,
        entityType,
        entityId: item.id,
        ownerCoachId,
      });
      registered += 1;
    }
  }

  return { scanned: items.length, created, registered };
}

async function seedHealUserReferralCodes() {
  const items = await scanTable(USER_TABLE);
  let created = 0;
  let registered = 0;

  for (const item of items) {
    if (normalizeUserTier(item.userTier) !== "heal") continue;

    let code = item.referralCode ? String(item.referralCode).trim().toUpperCase() : "";
    if (!code) {
      code = await nextUniqueCode();
      await docClient.send(
        new UpdateCommand({
          TableName: USER_TABLE,
          Key: { id: item.id },
          UpdateExpression: "SET referralCode = :referralCode, updatedAt = :updatedAt",
          ExpressionAttributeValues: {
            ":referralCode": code,
            ":updatedAt": new Date().toISOString(),
          },
        })
      );
      created += 1;
      console.log(`  [User/heal] ${item.id} → ${code}`);
    }

    const ownerCoachId = String(item.parentCoachId || "").trim() || "pending";
    const existing = await getReferralCodeRecord(code);
    if (!existing) {
      await registerReferralCode({
        referralCode: code,
        entityType: "user",
        entityId: item.id,
        ownerCoachId,
      });
      registered += 1;
    }
  }

  return { created, registered };
}

async function main() {
  console.log("Seeding referral codes...\n");

  await ensureReferralCodeTable();

  console.log("WellnessCoach:");
  const coaches = await seedTableReferralCodes(WELLNESS_COACH_TABLE, "wellness_coach", (row) => row.id);
  console.log(`  scanned=${coaches.scanned} newCodes=${coaches.created} registryAdded=${coaches.registered}\n`);

  console.log("AssistantWellnessCoach:");
  const assistants = await seedTableReferralCodes(
    ASSISTANT_TABLE,
    "assistant_wellness_coach",
    (row) => String(row.wellnessCoachId || "").trim()
  );
  console.log(
    `  scanned=${assistants.scanned} newCodes=${assistants.created} registryAdded=${assistants.registered}\n`
  );

  console.log("Heal users:");
  const healUsers = await seedHealUserReferralCodes();
  console.log(`  newCodes=${healUsers.created} registryAdded=${healUsers.registered}\n`);

  console.log("Referral code seed finished.");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exitCode = 1;
});
