/**
 * Migration 55: StatusOrderIndex GSI for config-section tables.
 *
 *  1. Renumber all rows with distinct (index+1)*10 order by current sort (order asc, createdAt asc).
 *  2. Add StatusOrderIndex (status HASH + order RANGE) for sort-then-paginate lists.
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");
const { normalizeOrder } = require("../../utils/displayOrder");

const INDEX_NAME = "StatusOrderIndex";

const TABLES = [
  "ClientTestimonials",
  "RealPeopleTestimonial",
  "VideoTestimonials",
  "LeadershipNotes",
  "HealthDisorder",
  "HealthRecipe",
  "Yoga",
];

async function renumberTableOrders(tableName) {
  if (!(await tableExists(tableName))) {
    console.log(`  [${tableName}] table does not exist — skip order renumber`);
    return { updated: 0 };
  }

  console.log(`[${tableName}] Renumbering all rows with distinct order values...`);
  const items = await scanTable(tableName);
  if (!items.length) {
    console.log(`[${tableName}] No rows to renumber.`);
    return { updated: 0 };
  }

  await backupTable(tableName);

  const now = new Date().toISOString();
  const sorted = [...items].sort((a, b) => {
    const orderA = normalizeOrder(a.order, 9999);
    const orderB = normalizeOrder(b.order, 9999);
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  let updated = 0;
  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const nextOrder = (index + 1) * 10;
    const currentOrder = normalizeOrder(item.order, 9999);
    if (currentOrder === nextOrder) continue;
    await docClient.send(
      new UpdateCommand({
        TableName: tableName,
        Key: { id: item.id },
        UpdateExpression: "SET #order = :order, updatedAt = :updatedAt",
        ExpressionAttributeNames: { "#order": "order" },
        ExpressionAttributeValues: {
          ":order": nextOrder,
          ":updatedAt": now,
        },
      })
    );
    updated += 1;
  }

  console.log(`[${tableName}] Renumbered ${updated} record(s).`);
  return { updated };
}

async function ensureStatusOrderIndex(tableName) {
  if (!(await tableExists(tableName))) {
    console.log(`  [${tableName}] table does not exist — skip GSI`);
    return false;
  }

  const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
  const existingIndexes = (Table.GlobalSecondaryIndexes || []).map((g) => g.IndexName);
  if (existingIndexes.includes(INDEX_NAME)) {
    const gsi = (Table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === INDEX_NAME);
    if (gsi?.IndexStatus !== "ACTIVE") {
      await waitForGsiActive(tableName, INDEX_NAME);
    }
    console.log(`  [${tableName}] ${INDEX_NAME} already exists — skip`);
    return false;
  }

  const definedAttrs = new Map(
    (Table.AttributeDefinitions || []).map((a) => [a.AttributeName, a.AttributeType])
  );
  if (!definedAttrs.has("status")) {
    definedAttrs.set("status", "S");
  }
  if (!definedAttrs.has("order")) {
    definedAttrs.set("order", "N");
  }

  const attributeDefinitions = [...definedAttrs.entries()].map(([AttributeName, AttributeType]) => ({
    AttributeName,
    AttributeType,
  }));

  const billingMode = Table.BillingModeSummary?.BillingMode;
  const isPayPerRequest = billingMode === "PAY_PER_REQUEST";
  const gsiCreate = {
    IndexName: INDEX_NAME,
    KeySchema: [
      { AttributeName: "status", KeyType: "HASH" },
      { AttributeName: "order", KeyType: "RANGE" },
    ],
    Projection: { ProjectionType: "ALL" },
  };

  if (!isPayPerRequest) {
    const throughput =
      Table.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput || Table.ProvisionedThroughput;
    gsiCreate.ProvisionedThroughput = {
      ReadCapacityUnits: throughput?.ReadCapacityUnits || 5,
      WriteCapacityUnits: throughput?.WriteCapacityUnits || 5,
    };
  }

  console.log(`  [${tableName}] Adding ${INDEX_NAME} GSI...`);
  await client.send(
    new UpdateTableCommand({
      TableName: tableName,
      AttributeDefinitions: attributeDefinitions,
      GlobalSecondaryIndexUpdates: [{ Create: gsiCreate }],
    })
  );

  await waitForGsiActive(tableName, INDEX_NAME);
  console.log(`  [${tableName}] ${INDEX_NAME} GSI is ACTIVE`);
  return true;
}

async function migrateConfigSectionsStatusOrderIndex() {
  console.log("Config sections StatusOrderIndex migration...");
  const results = [];

  for (const tableName of TABLES) {
    console.log(`\n--- ${tableName} ---`);
    const renumberResult = await renumberTableOrders(tableName);
    const indexCreated = await ensureStatusOrderIndex(tableName);
    results.push({
      table: tableName,
      orderRenumber: renumberResult.updated,
      indexCreated,
    });
  }

  return { tables: results };
}

module.exports = {
  id: "55-config-sections-status-order-index",
  migrateConfigSectionsStatusOrderIndex,
  renumberTableOrders,
  ensureStatusOrderIndex,
  TABLES,
};
