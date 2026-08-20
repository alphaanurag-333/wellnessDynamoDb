/**
 * Migration 48: User ReferredByEntityIndex GSI for coach/AWC referral trees.
 *
 *  1. REMOVE null/empty referredByEntityId so the sparse GSI key is valid.
 *  2. Add ReferredByEntityIndex (referredByEntityId HASH + createdAt RANGE).
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");

const TABLE = "User";
const INDEX_NAME = "ReferredByEntityIndex";

async function stripNullReferredByEntityId() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip referredByEntityId cleanup`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Scanning for null/empty referredByEntityId...`);
  const items = await scanTable(TABLE);
  const pending = items.filter((item) => {
    if (!Object.prototype.hasOwnProperty.call(item, "referredByEntityId")) return false;
    const value = item.referredByEntityId;
    return value == null || String(value).trim() === "";
  });

  if (pending.length === 0) {
    console.log(`[${TABLE}] No null/empty referredByEntityId attributes — skip.`);
    return { updated: 0 };
  }

  await backupTable(TABLE);

  let updated = 0;
  for (const item of pending) {
    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: item.id },
        UpdateExpression: "REMOVE referredByEntityId",
        ConditionExpression: "attribute_exists(id)",
      })
    );
    updated += 1;
  }

  console.log(`[${TABLE}] Removed null/empty referredByEntityId on ${updated} record(s).`);
  return { updated };
}

async function ensureReferredByEntityIndex() {
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
  if (!definedAttrs.has("referredByEntityId")) {
    definedAttrs.set("referredByEntityId", "S");
  }
  if (!definedAttrs.has("createdAt")) {
    definedAttrs.set("createdAt", "S");
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
      { AttributeName: "referredByEntityId", KeyType: "HASH" },
      { AttributeName: "createdAt", KeyType: "RANGE" },
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

async function migrateReferredByEntityIndex() {
  console.log("User ReferredByEntityIndex migration...");
  const cleanup = await stripNullReferredByEntityId();
  const created = await ensureReferredByEntityIndex();
  return {
    table: TABLE,
    referredByEntityCleanup: cleanup.updated,
    indexCreated: created,
  };
}

module.exports = {
  id: "48-referred-by-entity-index",
  migrateReferredByEntityIndex,
  ensureReferredByEntityIndex,
  stripNullReferredByEntityId,
};
