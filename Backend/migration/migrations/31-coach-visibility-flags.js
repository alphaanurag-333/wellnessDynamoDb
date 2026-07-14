/**
 * Migration 31: Web / App visibility flags for coaches & assistants.
 *
 * Backfill `webVisible=true` and `appVisible=true` on existing
 * WellnessCoach and AssistantWellnessCoach rows so public listings stay
 * unchanged until an admin toggles them off.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists } = require("../lib/helpers");

const TABLES = ["WellnessCoach", "AssistantWellnessCoach"];

function needsBackfill(item) {
  return item.webVisible === undefined || item.appVisible === undefined;
}

async function backfillTable(tableName) {
  if (!(await tableExists(tableName))) {
    console.log(`  [${tableName}] table does not exist — skip`);
    return { updated: 0 };
  }

  console.log(`[${tableName}] Scanning for missing webVisible/appVisible...`);
  const items = await scanTable(tableName);
  const pending = items.filter(needsBackfill);

  if (pending.length === 0) {
    console.log(`[${tableName}] Nothing to backfill — skip.`);
    return { updated: 0 };
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
  return { updated };
}

async function migrateCoachVisibilityFlags() {
  let total = 0;
  for (const tableName of TABLES) {
    const { updated } = await backfillTable(tableName);
    total += updated;
  }
  console.log(`Done. Updated ${total} row(s) across ${TABLES.length} table(s).`);
}

module.exports = {
  id: "31-coach-visibility-flags",
  migrateCoachVisibilityFlags,
};
