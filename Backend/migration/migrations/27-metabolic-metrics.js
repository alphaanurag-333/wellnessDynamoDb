/**
 * Migration 27: Metabolic health metrics (BMI, BMR, body fat, visceral fat).
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["HealthProgressMetabolicMetric"];

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

async function migrateMetabolicMetrics() {
  console.log("Creating Metabolic Metrics tables...");
  await ensureNewTables();
  console.log("Metabolic Metrics tables ready.");
}

module.exports = {
  id: "27-metabolic-metrics",
  NEW_TABLES,
  migrateMetabolicMetrics,
};
