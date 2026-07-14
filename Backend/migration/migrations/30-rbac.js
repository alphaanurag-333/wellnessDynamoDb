/**
 * Migration 30: Role-Based Access Control (RBAC).
 *
 *  1. Create the Role table.
 *  2. Add StatusCreatedAtIndex + RoleIdIndex GSIs to the existing Admin table.
 *  3. Backfill isSuperAdmin/roleId/status on every existing Admin row so the
 *     current single admin becomes a Super Admin (preserves existing logins).
 */
const { UpdateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const { backupTable, createAllTables, scanTable, tableExists, waitForGsiActive } = require("../lib/helpers");

const ADMIN_TABLE = "Admin";
const ROLE_TABLE = "Role";
const ADMIN_GSIS_TO_ADD = ["StatusCreatedAtIndex", "RoleIdIndex"];

async function ensureRoleTable() {
  if (await tableExists(ROLE_TABLE)) {
    console.log(`  [${ROLE_TABLE}] already exists — skip create`);
    return false;
  }

  const definition = getTableDefinition(ROLE_TABLE);
  if (!definition) {
    throw new Error(`Missing table definition for ${ROLE_TABLE}`);
  }

  await createAllTables([definition]);
  return true;
}

async function ensureAdminGsi(indexName) {
  if (!(await tableExists(ADMIN_TABLE))) {
    console.log(`  [${ADMIN_TABLE}] table does not exist — skip ${indexName}`);
    return false;
  }

  const { Table } = await client.send(new DescribeTableCommand({ TableName: ADMIN_TABLE }));
  const existing = (Table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === indexName);
  if (existing) {
    if (existing.IndexStatus !== "ACTIVE") {
      await waitForGsiActive(ADMIN_TABLE, indexName);
    }
    console.log(`  [${ADMIN_TABLE}] ${indexName} already exists — skip`);
    return false;
  }

  const definedAttrs = new Map(
    (Table.AttributeDefinitions || []).map((a) => [a.AttributeName, a.AttributeType])
  );

  const gsiCreate =
    indexName === "StatusCreatedAtIndex"
      ? {
          IndexName: indexName,
          KeySchema: [
            { AttributeName: "status", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        }
      : {
          IndexName: indexName,
          KeySchema: [
            { AttributeName: "roleId", KeyType: "HASH" },
            { AttributeName: "createdAt", KeyType: "RANGE" },
          ],
          Projection: { ProjectionType: "ALL" },
        };

  for (const key of gsiCreate.KeySchema) {
    if (!definedAttrs.has(key.AttributeName)) {
      definedAttrs.set(key.AttributeName, "S");
    }
  }

  const attributeDefinitions = [...definedAttrs.entries()].map(([AttributeName, AttributeType]) => ({
    AttributeName,
    AttributeType,
  }));

  const billingMode = Table.BillingModeSummary?.BillingMode;
  const isPayPerRequest = billingMode === "PAY_PER_REQUEST";
  if (!isPayPerRequest) {
    const throughput =
      Table.GlobalSecondaryIndexes?.[0]?.ProvisionedThroughput || Table.ProvisionedThroughput;
    gsiCreate.ProvisionedThroughput = {
      ReadCapacityUnits: throughput?.ReadCapacityUnits || 5,
      WriteCapacityUnits: throughput?.WriteCapacityUnits || 5,
    };
  }

  console.log(`  [${ADMIN_TABLE}] Adding ${indexName} GSI...`);
  await client.send(
    new UpdateTableCommand({
      TableName: ADMIN_TABLE,
      AttributeDefinitions: attributeDefinitions,
      GlobalSecondaryIndexUpdates: [{ Create: gsiCreate }],
    })
  );

  await waitForGsiActive(ADMIN_TABLE, indexName);
  console.log(`  [${ADMIN_TABLE}] ${indexName} GSI is ACTIVE`);
  return true;
}

async function ensureAdminGsis() {
  let anyCreated = false;
  for (const indexName of ADMIN_GSIS_TO_ADD) {
    // DynamoDB only allows one GSI mutation per UpdateTable call.
    const created = await ensureAdminGsi(indexName);
    anyCreated = anyCreated || created;
  }
  return anyCreated;
}

async function backfillAdminRbacFields() {
  if (!(await tableExists(ADMIN_TABLE))) {
    console.log(`  [${ADMIN_TABLE}] table does not exist — skip backfill`);
    return { updated: 0 };
  }

  console.log(`[${ADMIN_TABLE}] Scanning for rows missing isSuperAdmin...`);
  const items = await scanTable(ADMIN_TABLE);
  const pending = items.filter((item) => item.isSuperAdmin === undefined);

  if (pending.length === 0) {
    console.log(`[${ADMIN_TABLE}] All rows already have isSuperAdmin — skip.`);
    return { updated: 0 };
  }

  await backupTable(ADMIN_TABLE);

  const now = new Date().toISOString();
  let updated = 0;

  for (const item of pending) {
    // Every pre-existing Admin row predates RBAC — promote it to Super Admin
    // so today's admin(s) keep full access and nobody is locked out.
    // Do NOT set roleId: null — RoleIdIndex GSI keys cannot be null; omit the attribute.
    await docClient.send(
      new UpdateCommand({
        TableName: ADMIN_TABLE,
        Key: { id: item.id },
        UpdateExpression:
          "SET isSuperAdmin = :isSuperAdmin, #status = if_not_exists(#status, :status), updatedAt = :updatedAt REMOVE roleId",
        ExpressionAttributeNames: { "#status": "status" },
        ExpressionAttributeValues: {
          ":isSuperAdmin": true,
          ":status": "active",
          ":updatedAt": now,
        },
      })
    );
    updated += 1;
  }

  console.log(`[${ADMIN_TABLE}] Backfilled isSuperAdmin/roleId on ${updated} record(s).`);
  return { updated };
}

async function migrateRbac() {
  console.log("RBAC migration...");
  const roleTableCreated = await ensureRoleTable();
  await ensureAdminGsis();
  const backfillResult = await backfillAdminRbacFields();
  return {
    roleTableCreated,
    adminBackfill: backfillResult.updated,
  };
}

module.exports = {
  id: "30-rbac",
  migrateRbac,
  ensureRoleTable,
  ensureAdminGsis,
  backfillAdminRbacFields,
};
