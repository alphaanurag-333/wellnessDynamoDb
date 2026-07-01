/**
 * Migration 17: Meal tracking review workflow.
 *
 *  1. Add CoachCreatedAtIndex GSI to MealTracking table.
 *  2. Backfill existing meal logs with status=approved (legacy trusted logs).
 */
const {
  UpdateTableCommand,
  DescribeTableCommand,
} = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists } = require("../lib/helpers");

const TABLE = "MealTracking";
const INDEX_NAME = "CoachCreatedAtIndex";

async function ensureCoachCreatedAtIndex() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip GSI`);
    return;
  }

  const { Table } = await client.send(
    new DescribeTableCommand({ TableName: TABLE })
  );
  const existing = (Table.GlobalSecondaryIndexes || []).map((g) => g.IndexName);
  if (existing.includes(INDEX_NAME)) {
    console.log(`  [${TABLE}] ${INDEX_NAME} already exists — skip`);
    return;
  }

  console.log(`  [${TABLE}] Adding ${INDEX_NAME} GSI...`);
  await client.send(
    new UpdateTableCommand({
      TableName: TABLE,
      AttributeDefinitions: [
        { AttributeName: "coachId", AttributeType: "S" },
        { AttributeName: "createdAt", AttributeType: "S" },
      ],
      GlobalSecondaryIndexUpdates: [
        {
          Create: {
            IndexName: INDEX_NAME,
            KeySchema: [
              { AttributeName: "coachId", KeyType: "HASH" },
              { AttributeName: "createdAt", KeyType: "RANGE" },
            ],
            Projection: { ProjectionType: "ALL" },
          },
        },
      ],
    })
  );
  console.log(`  [${TABLE}] ${INDEX_NAME} GSI created`);
}

function needsBackfill(item) {
  return !item.status;
}

async function backfillMealLogStatus() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip backfill`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Scanning for meal logs missing status...`);
  const items = await scanTable(TABLE);
  const pending = items.filter(needsBackfill);

  if (pending.length === 0) {
    console.log(`[${TABLE}] Nothing to backfill — skip.`);
    return { updated: 0 };
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
          "SET #status = :approved, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":approved": "approved",
          ":updatedAt": now,
        },
      })
    );
    updated += 1;
  }

  console.log(`[${TABLE}] Backfilled status=approved on ${updated} record(s).`);
  return { updated };
}

async function migrateMealTrackingReview() {
  console.log("Meal tracking review migration...");
  await ensureCoachCreatedAtIndex();
  const result = await backfillMealLogStatus();
  return { table: TABLE, ...result };
}

module.exports = {
  id: "17-meal-tracking-review",
  migrateMealTrackingReview,
};
