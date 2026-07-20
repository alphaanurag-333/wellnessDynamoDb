/**
 * Migration 33: Transformation StatusOrderIndex GSI.
 *
 *  1. Ensure every row has numeric `order` (required for GSI projection).
 *  2. Add StatusOrderIndex (status HASH + order RANGE) for sort-then-paginate lists.
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");
const { normalizeOrder } = require("../../models/transformationModel");

const TABLE = "Transformation";
const INDEX_NAME = "StatusOrderIndex";

async function backfillNumericOrder() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip order backfill`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Scanning for rows needing numeric order...`);
  const items = await scanTable(TABLE);
  const pending = items.filter((item) => {
    const raw = item.order;
    if (raw == null || raw === "") return true;
    return typeof raw !== "number" || !Number.isFinite(raw);
  });

  if (pending.length === 0) {
    console.log(`[${TABLE}] All rows already have numeric order — skip.`);
    return { updated: 0 };
  }

  await backupTable(TABLE);

  const now = new Date().toISOString();
  let updated = 0;

  for (const item of pending) {
    const nextOrder = normalizeOrder(item.order, 0);
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
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

  console.log(`[${TABLE}] Normalized order on ${updated} record(s).`);
  return { updated };
}

async function ensureStatusOrderIndex() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip GSI`);
    return false;
  }

  const { Table } = await client.send(new DescribeTableCommand({ TableName: TABLE }));
  const existingIndexes = (Table.GlobalSecondaryIndexes || []).map((g) => g.IndexName);
  if (existingIndexes.includes(INDEX_NAME)) {
    const gsi = (Table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === INDEX_NAME);
    if (gsi?.IndexStatus !== "ACTIVE") {
      await waitForGsiActive(TABLE, INDEX_NAME);
    }
    console.log(`  [${TABLE}] ${INDEX_NAME} already exists — skip`);
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

  console.log(`  [${TABLE}] Adding ${INDEX_NAME} GSI...`);
  await client.send(
    new UpdateTableCommand({
      TableName: TABLE,
      AttributeDefinitions: attributeDefinitions,
      GlobalSecondaryIndexUpdates: [{ Create: gsiCreate }],
    })
  );

  await waitForGsiActive(TABLE, INDEX_NAME);
  console.log(`  [${TABLE}] ${INDEX_NAME} GSI is ACTIVE`);
  return true;
}

async function migrateTransformationStatusOrderIndex() {
  console.log("Transformation StatusOrderIndex migration...");
  const backfillResult = await backfillNumericOrder();
  const created = await ensureStatusOrderIndex();
  return {
    table: TABLE,
    orderBackfill: backfillResult.updated,
    indexCreated: created,
  };
}

module.exports = {
  id: "33-transformation-status-order-index",
  migrateTransformationStatusOrderIndex,
  ensureStatusOrderIndex,
  backfillNumericOrder,
};
