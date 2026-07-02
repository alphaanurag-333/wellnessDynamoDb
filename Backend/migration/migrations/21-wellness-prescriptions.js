/**
 * Migration 21: Wellness Prescription Catalog + coach assignments.
 *
 * Idempotently create:
 *   - WellnessPrescriptionCatalog
 *   - CoachAssignedWellnessPrescription
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["WellnessPrescriptionCatalog", "CoachAssignedWellnessPrescription"];

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

async function migrateWellnessPrescriptions() {
  console.log("Creating Wellness Prescription tables...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "21-wellness-prescriptions",
  NEW_TABLES,
  migrateWellnessPrescriptions,
};
