/**
 * Migration 18: Supplement recommendations + dosage tracking.
 *
 * Idempotently create:
 *   - CoachRecommendedSupplement
 *   - UserSupplementDosage
 *   - UserSupplementDosageLog
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = [
  "CoachRecommendedSupplement",
  "UserSupplementDosage",
  "UserSupplementDosageLog",
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

async function migrateSupplementFlow() {
  console.log("Creating Supplement recommendation & dosage tables...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "18-supplement-flow",
  NEW_TABLES,
  migrateSupplementFlow,
};
