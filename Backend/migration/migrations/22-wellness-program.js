/**
 * Migration 22: Wellness Program catalog + per-user assignments.
 *
 * 1. Idempotently create:
 *    - ProgramCatalog
 *    - UserProgram
 * 2. Backfill programPurchased=true on existing heal users.
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

const NEW_TABLES = ["ProgramCatalog", "UserProgram"];

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

function needsProgramBackfill(item) {
  if (String(item.userTier || "").toLowerCase() !== "heal") return false;
  if (item.programPurchased === true) return false;
  return true;
}

async function backfillHealUsersProgramPurchased() {
  console.log(`[${USER_TABLE}] Scanning heal users to backfill programPurchased...`);
  const items = await scanTable(USER_TABLE);
  const pending = items.filter(needsProgramBackfill);

  if (pending.length === 0) {
    console.log(`[${USER_TABLE}] Nothing to backfill for programPurchased — skip.`);
    return { updated: 0 };
  }

  await backupTable(USER_TABLE);

  const now = new Date().toISOString();
  let updated = 0;
  for (const item of pending) {
    const purchasedAt = item.healPaidAt || item.convertedAt || now;
    await docClient.send(
      new UpdateCommand({
        TableName: USER_TABLE,
        Key: { id: item.id },
        UpdateExpression:
          "SET programPurchased = :true, programPurchasedAt = :purchasedAt, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":true": true,
          ":purchasedAt": purchasedAt,
          ":updatedAt": now,
        },
        ConditionExpression: "attribute_exists(id)",
      })
    );
    updated += 1;
  }

  console.log(`[${USER_TABLE}] Backfilled programPurchased on ${updated} heal user(s).`);
  return { updated };
}

async function migrateWellnessProgram() {
  console.log("Creating Wellness Program tables...");
  await ensureNewTables();
  return backfillHealUsersProgramPurchased();
}

module.exports = {
  id: "22-wellness-program",
  USER_TABLE,
  NEW_TABLES,
  migrateWellnessProgram,
};
