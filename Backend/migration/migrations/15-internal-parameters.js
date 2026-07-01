/**
 * Migration 15: Internal Parameters (blood test catalog + coach recommendations + user reports).
 *
 * Idempotently create:
 *   - TestCatalog
 *   - CoachRecommendedTest
 *   - UserLabReport
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["TestCatalog", "CoachRecommendedTest", "UserLabReport"];

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

async function migrateInternalParameters() {
  console.log("Creating Internal Parameters tables...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "15-internal-parameters",
  NEW_TABLES,
  migrateInternalParameters,
};
