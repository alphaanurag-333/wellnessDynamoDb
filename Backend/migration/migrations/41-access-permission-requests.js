/**
 * Migration 41: AccessPermissionRequest table for WC → Admin AWC permission approvals.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists } = require("../lib/helpers");

const TABLE = "AccessPermissionRequest";

async function migrateAccessPermissionRequests() {
  if (await tableExists(TABLE)) {
    console.log(`  [${TABLE}] table already exists — skip`);
    return false;
  }

  const definition = getTableDefinition(TABLE);
  if (!definition) {
    throw new Error(`Missing table definition for ${TABLE}`);
  }

  await client.send(new CreateTableCommand(definition));
  console.log(`  [${TABLE}] table created`);
  return true;
}

module.exports = {
  id: "41-access-permission-requests",
  migrateAccessPermissionRequests,
};
