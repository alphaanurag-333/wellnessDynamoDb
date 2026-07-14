/**
 * Migration 32: Web / App visibility flags for Leadership Notes.
 *
 * Backfill `webVisible=true` and `appVisible=true` on existing
 * LeadershipNotes rows so public listings stay unchanged until toggled off.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists } = require("../lib/helpers");

const TABLE = "LeadershipNotes";

function needsBackfill(item) {
  return item.webVisible === undefined || item.appVisible === undefined;
}

async function migrateLeadershipNoteVisibilityFlags() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip`);
    return;
  }

  console.log(`[${TABLE}] Scanning for missing webVisible/appVisible...`);
  const items = await scanTable(TABLE);
  const pending = items.filter(needsBackfill);

  if (pending.length === 0) {
    console.log(`[${TABLE}] Nothing to backfill — skip.`);
    return;
  }

  await backupTable(TABLE);

  const now = new Date().toISOString();
  let updated = 0;
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
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

  console.log(`[${TABLE}] Backfilled ${updated} row(s).`);
}

module.exports = {
  id: "32-leadership-note-visibility-flags",
  migrateLeadershipNoteVisibilityFlags,
};
