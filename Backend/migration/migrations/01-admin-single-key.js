/**
 * Admin: composite PK (id + createdAt) → single hash key (id)
 * Removes unused PhoneIndex by recreating the table.
 */
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../../config/db");
const {
  describeTable,
  backupTable,
  restoreItems,
  waitForTableDeleted,
  waitForTableActive,
  tableRangeKeyName,
  client,
  CreateTableCommand,
  DeleteTableCommand,
} = require("../lib/helpers");

const TABLE = "Admin";

async function migrateAdminSingleKey() {
  const table = await describeTable(TABLE);
  const rangeKey = tableRangeKeyName(table);

  if (!rangeKey) {
    console.log("[Admin] Already single hash key — skip PK migration.");
    return { skipped: true, table: TABLE };
  }

  console.log(`[Admin] Migrating PK: id + ${rangeKey} → id only`);

  const { items } = await backupTable(TABLE);

  console.log("[Admin] Deleting table...");
  await client.send(new DeleteTableCommand({ TableName: TABLE }));
  await waitForTableDeleted(TABLE);

  console.log("[Admin] Recreating table...");
  await client.send(
    new CreateTableCommand({
      TableName: TABLE,
      KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
      AttributeDefinitions: [
        { AttributeName: "id", AttributeType: "S" },
        { AttributeName: "email", AttributeType: "S" },
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "EmailIndex",
          KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
          Projection: { ProjectionType: "ALL" },
        },
      ],
      BillingMode: "PAY_PER_REQUEST",
    })
  );
  await waitForTableActive(TABLE);

  console.log("[Admin] Restoring items...");
  await restoreItems(TABLE, items);
  for (const item of items) {
    console.log(`  Restored ${item.id} (${item.email})`);
  }

  console.log("[Admin] Migration complete.");
  return { skipped: false, table: TABLE, restored: items.length };
}

module.exports = { id: "01-admin-single-key", TABLE, migrateAdminSingleKey };
