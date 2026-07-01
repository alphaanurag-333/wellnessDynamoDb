/**
 * Migration 17: Meal tracking review workflow.
 *
 *  1. Add CoachCreatedAtIndex GSI to MealTracking table.
 *  2. Backfill coachId on legacy meal logs (required for coach pending-review queries).
 *  3. Backfill existing meal logs with status=approved (legacy trusted logs).
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { getUserById } = require("../../models/userModel");
const { backupTable, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");

const TABLE = "MealTracking";
const INDEX_NAME = "CoachCreatedAtIndex";

function resolveAssignedCoachFromUser(user) {
  const assignedCoachType = String(user?.assignedCoachType || "").trim().toLowerCase();
  const assignedCoachId = String(user?.assignedCoachId || "").trim();
  const parentCoachId = String(user?.parentCoachId || "").trim();

  if (assignedCoachType === "assistant_wellness_coach" && assignedCoachId) {
    return {
      assignedCoachId,
      assignedCoachType: "assistant_wellness_coach",
      coachId: parentCoachId || assignedCoachId,
    };
  }

  return {
    assignedCoachId: parentCoachId || assignedCoachId || null,
    assignedCoachType: "wellness_coach",
    coachId: parentCoachId || assignedCoachId || null,
  };
}

async function ensureCoachCreatedAtIndex() {
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
  if (!definedAttrs.has("coachId")) {
    definedAttrs.set("coachId", "S");
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
      { AttributeName: "coachId", KeyType: "HASH" },
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
      GlobalSecondaryIndexUpdates: [
        {
          Create: gsiCreate,
        },
      ],
    })
  );

  await waitForGsiActive(TABLE, INDEX_NAME);
  console.log(`  [${TABLE}] ${INDEX_NAME} GSI is ACTIVE`);
  return true;
}

async function backfillMealLogCoachIds() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip coachId backfill`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Scanning for meal logs missing coachId...`);
  const items = await scanTable(TABLE);
  const pending = items.filter((item) => !String(item.coachId || "").trim());

  if (pending.length === 0) {
    console.log(`[${TABLE}] All meal logs already have coachId — skip.`);
    return { updated: 0 };
  }

  await backupTable(TABLE);

  const userCache = new Map();
  const now = new Date().toISOString();
  let updated = 0;

  for (const item of pending) {
    const uid = String(item.userId || "").trim();
    if (!uid) continue;

    if (!userCache.has(uid)) {
      userCache.set(uid, await getUserById(uid));
    }
    const user = userCache.get(uid);
    const assignment = resolveAssignedCoachFromUser(user);
    if (!assignment.coachId) continue;

    const sets = ["coachId = :coachId", "updatedAt = :updatedAt"];
    const values = {
      ":coachId": assignment.coachId,
      ":updatedAt": now,
    };
    const names = {};

    if (!item.assignedCoachId && assignment.assignedCoachId) {
      sets.push("assignedCoachId = :assignedCoachId");
      values[":assignedCoachId"] = assignment.assignedCoachId;
    }
    if (!item.assignedCoachType && assignment.assignedCoachType) {
      sets.push("assignedCoachType = :assignedCoachType");
      values[":assignedCoachType"] = assignment.assignedCoachType;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: TABLE,
        Key: { id: item.id },
        UpdateExpression: `SET ${sets.join(", ")}`,
        ExpressionAttributeNames: Object.keys(names).length ? names : undefined,
        ExpressionAttributeValues: values,
      })
    );
    updated += 1;
  }

  console.log(`[${TABLE}] Backfilled coachId on ${updated} record(s).`);
  return { updated };
}

function needsStatusBackfill(item) {
  return !item.status;
}

async function backfillMealLogStatus() {
  if (!(await tableExists(TABLE))) {
    console.log(`  [${TABLE}] table does not exist — skip status backfill`);
    return { updated: 0 };
  }

  console.log(`[${TABLE}] Scanning for meal logs missing status...`);
  const items = await scanTable(TABLE);
  const pending = items.filter(needsStatusBackfill);

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
        UpdateExpression: "SET #status = :approved, updatedAt = :updatedAt",
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
  const coachResult = await backfillMealLogCoachIds();
  const statusResult = await backfillMealLogStatus();
  return {
    table: TABLE,
    coachIdBackfill: coachResult.updated,
    statusBackfill: statusResult.updated,
  };
}

module.exports = {
  id: "17-meal-tracking-review",
  migrateMealTrackingReview,
  ensureCoachCreatedAtIndex,
  backfillMealLogCoachIds,
  backfillMealLogStatus,
};
