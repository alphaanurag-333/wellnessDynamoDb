/**
 * Migration 17: LAUNCH assessment (question catalog + user assessments).
 *
 * Idempotently create:
 *   - LaunchQuestion
 *   - UserLaunchAssessment
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["LaunchQuestion", "UserLaunchAssessment"];

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

async function migrateLaunchAssessment() {
  console.log("Creating LAUNCH assessment tables...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "17-launch-assessment",
  NEW_TABLES,
  migrateLaunchAssessment,
};
