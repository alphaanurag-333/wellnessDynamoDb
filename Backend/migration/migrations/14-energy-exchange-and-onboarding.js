/**
 * Migration 14: Energy Exchange + Paid Onboarding.
 *
 *  1. Idempotently create the three new tables:
 *     - EnergyExchangeProgram
 *     - EnergyExchangeSubscription
 *     - UserBodyMeasurement
 *     - UserMedicalCondition
 *  2. Backfill `paidOnboardingCompleted=true` and `energyExchangeEnabled=true`
 *     on existing `heal` users so they don't get re-onboarded.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const {
  backupTable,
  scanTable,
  tableExists,
  createAllTables,
} = require("../lib/helpers");

const USER_TABLE = "User";

const NEW_TABLES = [
  "EnergyExchangeProgram",
  "EnergyExchangeSubscription",
  "UserBodyMeasurement",
  "UserMedicalCondition",
];

async function ensureNewTables() {
  const pending = [];

  for (const tableName of NEW_TABLES) {
    if (await tableExists(tableName)) {
      console.log(`  [${tableName}] already exists — skip create`);
      continue;
    }
    const definition = getTableDefinition(tableName);
    if (!definition) {
      throw new Error(`Missing table definition for ${tableName}`);
    }
    pending.push(definition);
  }

  if (pending.length > 0) {
    await createAllTables(pending);
  }
}

function needsBackfill(item) {
  if (String(item.userTier || "").toLowerCase() !== "heal") return false;
  if (item.paidOnboardingCompleted === true && item.energyExchangeEnabled === true) {
    return false;
  }
  return true;
}

async function backfillHealUsers() {
  console.log(`[${USER_TABLE}] Scanning for heal users to backfill onboarding flags...`);
  const items = await scanTable(USER_TABLE);
  const pending = items.filter(needsBackfill);

  if (pending.length === 0) {
    console.log(`[${USER_TABLE}] Nothing to backfill — skip.`);
    return { updated: 0 };
  }

  await backupTable(USER_TABLE);

  const now = new Date().toISOString();
  let updated = 0;
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: USER_TABLE,
        Key: { id: item.id },
        UpdateExpression:
          "SET paidOnboardingCompleted = :true, paidOnboardingStep = :done, energyExchangeEnabled = :true, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":true": true,
          ":done": "done",
          ":updatedAt": now,
        },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    updated += 1;
  }

  console.log(`[${USER_TABLE}] Backfilled ${updated} heal user(s).`);
  return { updated };
}

async function migrateEnergyExchangeAndOnboarding() {
  console.log("Creating Energy Exchange + Onboarding tables...");
  await ensureNewTables();
  return backfillHealUsers();
}

module.exports = {
  id: "14-energy-exchange-and-onboarding",
  USER_TABLE,
  NEW_TABLES,
  migrateEnergyExchangeAndOnboarding,
};
