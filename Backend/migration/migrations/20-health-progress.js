/**
 * Migration 20: Health Progress feature tables.
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = [
  "HealthProgressWeight",
  "HealthProgressGlucose",
  "HealthProgressBloodPressure",
  "HealthProgressMenstrualCycle",
  "HealthProgressCondition",
];

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

async function migrateHealthProgress() {
  console.log("Creating Health Progress tables...");
  await ensureNewTables();
  console.log("Health Progress tables ready.");
}

module.exports = {
  id: "20-health-progress",
  NEW_TABLES,
  migrateHealthProgress,
};
