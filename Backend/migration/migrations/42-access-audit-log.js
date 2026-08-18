/**
 * Migration 42: AccessAuditLog table for Access Control audit trail.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, waitForGsiActive } = require("../lib/helpers");
const { seedAccessAuditLogSamplesIfEmpty } = require("../../models/accessAuditLogModel");

const TABLE = "AccessAuditLog";

async function migrateAccessAuditLog() {
  if (!(await tableExists(TABLE))) {
    const definition = getTableDefinition(TABLE);
    if (!definition) {
      throw new Error(`Missing table definition for ${TABLE}`);
    }
    await client.send(new CreateTableCommand(definition));
    console.log(`  [${TABLE}] table created`);
    await waitForGsiActive(TABLE, "ScopeCreatedAtIndex");
  } else {
    console.log(`  [${TABLE}] table already exists — skip create`);
  }

  const seeded = await seedAccessAuditLogSamplesIfEmpty();
  if (seeded) {
    console.log(`  [${TABLE}] seeded sample audit entries`);
  } else {
    console.log(`  [${TABLE}] audit entries already present — skip seed`);
  }

  return true;
}

module.exports = {
  id: "42-access-audit-log",
  migrateAccessAuditLog,
};
