/**
 * Migration 51: Web / App visibility flags for Health Recipes + Yoga.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists } = require("../lib/helpers");

const TABLES = ["HealthRecipe", "Yoga"];

function needsBackfill(item) {
  return item.webVisible === undefined || item.appVisible === undefined;
}

async function backfillTable(tableName) {
  if (!(await tableExists(tableName))) {
    console.log(`  [${tableName}] table does not exist — skip`);
    return;
  }

  console.log(`[${tableName}] Scanning for missing webVisible/appVisible...`);
  const items = await scanTable(tableName);
  const pending = items.filter(needsBackfill);

  if (pending.length === 0) {
    console.log(`[${tableName}] Nothing to backfill — skip.`);
    return;
  }

  await backupTable(tableName);

  const now = new Date().toISOString();
  let updated = 0;
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: item.id },
        UpdateExpression:
          "SET webVisible = if_not_exists(webVisible, :true), appVisible = if_not_exists(appVisible, :true), updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":true": true,
          ":updatedAt": now,
        },
      })
    );
    updated += 1;
  }

  console.log(`[${tableName}] Backfilled ${updated} row(s).`);
}

async function migrateRecipeAndYogaVisibilityFlags() {
  for (const table of TABLES) {
    await backfillTable(table);
  }
}

module.exports = {
  id: "51-recipe-yoga-visibility-flags",
  migrateRecipeAndYogaVisibilityFlags,
};
