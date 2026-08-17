/**
 * Migration 38: DRF activity bank CMS (weighted sections + questions).
 */
const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");
const { tableExists } = require("../lib/helpers");
const { getTableDefinition } = require("../lib/tableSchemas");

const NEW_TABLES = ["DrfSection", "DrfSectionQuestion"];

async function ensureTable(tableName) {
  if (await tableExists(tableName)) {
    console.log(`  [${tableName}] already exists — skip create`);
    return false;
  }
  const params = getTableDefinition(tableName);
  if (!params) {
    throw new Error(`Missing table definition for ${tableName}`);
  }
  await client.send(new CreateTableCommand(params));
  console.log(`  [${tableName}] table created`);
  return true;
}

async function migrateDrfConfig() {
  console.log("Creating DRF config tables...");
  for (const tableName of NEW_TABLES) {
    await ensureTable(tableName);
  }
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "38-drf-config",
  NEW_TABLES,
  migrateDrfConfig,
};
