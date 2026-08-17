/**
 * Migration 40: Remove healthConcernId from HealthRecipe.
 *
 *  1. Strip healthConcernId from existing recipe rows.
 *  2. Drop HealthConcernCreatedAtIndex.
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists, waitForGsiDeleted } = require("../lib/helpers");

const TABLE = "HealthRecipe";
const INDEX_NAME = "HealthConcernCreatedAtIndex";

async function stripHealthConcernId() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip attribute strip`);
    return { updated: 0 };
  }

  const items = await scanTable(TABLE);
  const pending = items.filter((item) => item.healthConcernId != null || item.healthConcern != null);
  if (!pending.length) {
    console.log(`  [${TABLE}] no healthConcernId attributes — skip`);
    return { updated: 0 };
  }

  await backupTable(TABLE);
  let updated = 0;
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: item.id },
        UpdateExpression: "REMOVE healthConcernId, healthConcern SET updatedAt = :updatedAt",
        ExpressionAttributeValues: { ":updatedAt": new Date().toISOString() },
      })
    );
    updated += 1;
  }
  console.log(`  [${TABLE}] removed healthConcernId from ${updated} record(s)`);
  return { updated };
}

async function dropHealthConcernIndex() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip GSI drop`);
    return false;
  }

  const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE }));
  const existing = (Table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === INDEX_NAME);
  if (!existing) {
    console.log(`  [${TABLE}] ${INDEX_NAME} already gone — skip`);
    return false;
  }

  await client.send(
    new UpdateTableCommand({
      TableName: TABLE,
      GlobalSecondaryIndexUpdates: [{ Delete: { IndexName: INDEX_NAME } }],
    })
  );
  await waitForGsiDeleted(TABLE, INDEX_NAME);
  console.log(`  [${TABLE}] dropped ${INDEX_NAME}`);
  return true;
}

async function migrateHealthRecipeDropHealthConcern() {
  await stripHealthConcernId();
  await dropHealthConcernIndex();
}

module.exports = {
  id: "40-health-recipe-drop-health-concern",
  migrateHealthRecipeDropHealthConcern,
};
