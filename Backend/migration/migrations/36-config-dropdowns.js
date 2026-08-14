/**
 * Migration 36: ConfigDropdown table for Common Dropdowns CMS.
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { tableExists } = require("../lib/helpers");
const { getTableDefinition } = require("../lib/tableSchemas");

const TABLE = "ConfigDropdown";

async function migrateConfigDropdowns() {
  if (await tableExists(TABLE)) {
    console.log(`  [${TABLE}] table already exists — skip`);
    return false;
  }

  const params = getTableDefinition(TABLE);
  if (!params) {
    throw new Error(`Missing table definition for ${TABLE}`);
  }

  await client.send(new CreateTableCommand(params));
  console.log(`  [${TABLE}] table created`);
  return true;
}

module.exports = {
  id: "36-config-dropdowns",
  migrateConfigDropdowns,
};
