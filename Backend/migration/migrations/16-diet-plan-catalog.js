/**
 * Migration 16: Diet Plan Catalog + coach assignments.
 *
 * Idempotently create:
 *   - DietPlanCatalog
 *   - CoachAssignedDietPlan
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["DietPlanCatalog", "CoachAssignedDietPlan"];

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

async function migrateDietPlanCatalog() {
  console.log("Creating Diet Plan Catalog tables...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "16-diet-plan-catalog",
  NEW_TABLES,
  migrateDietPlanCatalog,
};
