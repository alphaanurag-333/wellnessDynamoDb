/**
 * Migration 54: WellnessTeamNotes StatusOrderIndex GSI.
 *
 *  1. Ensure every row has numeric `order` (required for GSI projection).
 *  2. Add StatusOrderIndex (status HASH + order RANGE) for sort-then-paginate lists.
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");
const { normalizeOrder } = require("../../models/wellnessTeamNoteModel");

const TABLE = "WellnessTeamNotes";
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

  const sorted = [...items].sort((a, b) => {
    const orderA = normalizeOrder(a.order, 9999);
    const orderB = normalizeOrder(b.order, 9999);
    if (orderA !== orderB) return orderA - orderB;
    return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
  });

  for (let index = 0; index < sorted.length; index += 1) {
    const item = sorted[index];
    const nextOrder = (index + 1) * 10;
    const currentOrder = normalizeOrder(item.order, 9999);
    if (currentOrder === nextOrder) continue;
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

async function renumberAllWellnessTeamOrders() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip order renumber`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Renumbering all profiles with distinct order values...`);
  const items = await scanTable(TABLE);
  if (!items.length) {
    console.log(`[${TABLE}] No rows to renumber.`);
    return { updated: 0 };
  }

  const uniqueOrders = new Set(items.map((item) => normalizeOrder(item.order, 9999)));
  if (uniqueOrders.size === items.length && !uniqueOrders.has(0)) {
    console.log(`[${TABLE}] Orders already distinct — skip renumber.`);
    return { updated: 0 };
  }

  await backupTable(TABLE);

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

  console.log(`[${TABLE}] Renumbered ${updated} record(s).`);
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

async function migrateWellnessTeamNotesStatusOrderIndex() {
  console.log("WellnessTeamNotes StatusOrderIndex migration...");
  const backfillResult = await backfillNumericOrder();
  const renumberResult = await renumberAllWellnessTeamOrders();
  const created = await ensureStatusOrderIndex();
  return {
    table: TABLE,
    orderBackfill: backfillResult.updated,
    orderRenumber: renumberResult.updated,
    indexCreated: created,
  };
}

module.exports = {
  id: "54-wellness-team-notes-status-order-index",
  migrateWellnessTeamNotesStatusOrderIndex,
  ensureStatusOrderIndex,
  backfillNumericOrder,
  renumberAllWellnessTeamOrders,
};
