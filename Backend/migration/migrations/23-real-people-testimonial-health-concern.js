/**
 * Migration 23: RealPeopleTestimonial health concern filter support.
 *
 *  1. Add HealthConcernCreatedAtIndex GSI.
 *  2. Backfill healthConcernId from each testimonial user's primaryHealthConcern.
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { getUserById } = require("../../models/userModel");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");

const TABLE = "RealPeopleTestimonial";
const INDEX_NAME = "HealthConcernCreatedAtIndex";

async function ensureHealthConcernCreatedAtIndex() {
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
  if (!definedAttrs.has("healthConcernId")) {
    definedAttrs.set("healthConcernId", "S");
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
      { AttributeName: "healthConcernId", KeyType: "HASH" },
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

async function backfillHealthConcernIds() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip backfill`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Scanning for testimonials missing healthConcernId...`);
  const items = await scanTable(TABLE);
  const pending = items.filter((item) => !String(item.healthConcernId || "").trim());

  if (pending.length === 0) {
    console.log(`[${TABLE}] All testimonials already have healthConcernId — skip.`);
    return { updated: 0 };
  }

  await backupTable(TABLE);

  const userCache = new Map();
  const now = new Date().toISOString();
  let updated = 0;

  for (const item of pending) {
    const userId = String(item.userId || "").trim();
    if (!userId) continue;

    if (!userCache.has(userId)) {
      userCache.set(userId, await getUserById(userId));
    }
    const user = userCache.get(userId);
    const healthConcernId = String(user?.primaryHealthConcern || "").trim();
    if (!healthConcernId) continue;

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: item.id },
        UpdateExpression: "SET healthConcernId = :healthConcernId, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":healthConcernId": healthConcernId,
          ":updatedAt": now,
        },
      })
    );
    updated += 1;
  }

  console.log(`[${TABLE}] Backfilled healthConcernId on ${updated} record(s).`);
  return { updated };
}

async function migrateRealPeopleTestimonialHealthConcern() {
  console.log("RealPeopleTestimonial health concern migration...");
  await ensureHealthConcernCreatedAtIndex();
  const backfillResult = await backfillHealthConcernIds();
  return {
    table: TABLE,
    healthConcernIdBackfill: backfillResult.updated,
  };
}

module.exports = {
  id: "23-real-people-testimonial-health-concern",
  migrateRealPeopleTestimonialHealthConcern,
  ensureHealthConcernCreatedAtIndex,
  backfillHealthConcernIds,
};
