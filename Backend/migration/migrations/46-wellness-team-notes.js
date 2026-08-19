/**
 * Migration 46: WellnessTeamNotes for Configs → Wellness Team Profile.
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["WellnessTeamNotes"];

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

  return pending.length > 0;
}

async function migrateWellnessTeamNotes() {
  console.log("WellnessTeamNotes migration...");
  const created = await ensureNewTables();
  return { tables: NEW_TABLES, created };
}

module.exports = {
  id: "46-wellness-team-notes",
  migrateWellnessTeamNotes,
  ensureNewTables,
};
