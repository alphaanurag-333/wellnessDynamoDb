/**
 * Migration 45: Private BMS wellness libraries (Mental Wellbeing, Yoga, Physical Exercise).
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { tableExists, createAllTables } = require("../lib/helpers");

const NEW_TABLES = [
  "MentalWellbeing",
  "AssignedMentalWellbeing",
  "PhysicalExercise",
  "WellnessYoga",
  "AssignedWellnessYoga",
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

  return pending.length > 0;
}

async function migrateWellnessLibraries() {
  console.log("Wellness library tables migration...");
  const created = await ensureNewTables();
  return { tables: NEW_TABLES, created };
}

module.exports = {
  id: "45-wellness-libraries",
  migrateWellnessLibraries,
  ensureNewTables,
};
