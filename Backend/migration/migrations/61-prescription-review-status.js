/**
 * Migration 61: Backfill reviewStatus on CoachAssignedWellnessPrescription rows.
 *
 * DynamoDB is schemaless — this ensures existing assignments default to active
 * so review history treats legacy prescriptions as valid coach reviews.
 */
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists } = require("../lib/helpers");

const TABLE = "CoachAssignedWellnessPrescription";

function needsBackfill(item) {
  return item.reviewStatus === undefined || item.reviewStatus === null;
}

async function migratePrescriptionReviewStatus() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip`);
    return;
  }

  console.log(`[${TABLE}] Scanning for missing reviewStatus...`);
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
          "SET reviewStatus = if_not_exists(reviewStatus, :active), updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":active": "active",
          ":updatedAt": item.updatedAt || now,
        },
      })
    );
    updated += 1;
  }

  console.log(`[${TABLE}] Backfilled reviewStatus on ${updated} row(s).`);
}

module.exports = {
  id: "61-prescription-review-status",
  migratePrescriptionReviewStatus,
};
