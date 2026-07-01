/**
 * Migration 19: Prakruti assessment (questions, things to avoid, recommendations, user assessments).
 *
 * Idempotently create:
 *   - PrakrutiQuestion
 *   - PrakrutiThingToAvoid
 *   - PrakrutiRecommendation
 *   - UserPrakrutiAssessment
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = [
  "PrakrutiQuestion",
  "PrakrutiThingToAvoid",
  "PrakrutiRecommendation",
  "UserPrakrutiAssessment",
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

async function migratePrakrutiAssessment() {
  console.log("Creating Prakruti assessment tables...");
  await ensureNewTables();
  return { tables: NEW_TABLES };
}

module.exports = {
  id: "19-prakruti-assessment",
  NEW_TABLES,
  migratePrakrutiAssessment,
};
