/**
 * Migration 58: Challenges feature tables.
 *
 * Idempotently create:
 *   - Challenge
 *   - ChallengeEnrollment
 *   - ChallengeGroup
 *
 * Definitions live in migration/lib/tableSchemas.js.
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = ["Challenge", "ChallengeEnrollment", "ChallengeGroup"];

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

async function migrateChallenges() {
  console.log("Challenges tables migration...");
  const created = await ensureNewTables();
  return { tables: NEW_TABLES, created };
}

module.exports = {
  id: "58-challenges",
  NEW_TABLES,
  migrateChallenges,
  ensureNewTables,
};
