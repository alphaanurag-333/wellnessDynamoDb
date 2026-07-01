/**
 * Migration 18: LAUNCH Area to Focus catalog.
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["LaunchFocusArea"];

async function ensureNewTables() {
  const pending = [];

  for (const tableName of NEW_TABLES) {
    if (await tableExists(tableName)) {
      console.log(`  [${tableName}] already exists — skip create`);
      continue;
    }
    const definition = getTableDefinition(tableName);
    if (!definition) {
      throw new Error(`Missing table definition for ${tableName}`);
    }
    pending.push(definition);
  }

  if (pending.length > 0) {
    await createAllTables(pending);
  }
}

async function migrateLaunchFocusAreas() {
  console.log("Creating LaunchFocusArea table...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "18-launch-focus-areas",
  NEW_TABLES,
  migrateLaunchFocusAreas,
};
