/**
 * Create BirthdayNotification, BirthdayPost, BirthdayPostComment tables.
 */
const { getTableDefinition } = require("../lib/tableSchemas");
const { createAllTables, tableExists } = require("../lib/helpers");

const TABLES = ["BirthdayNotification", "BirthdayPost", "BirthdayPostComment"];

async function migrateBirthdayTables() {
  const results = [];
  const pending = [];

  for (const tableName of TABLES) {
    console.log(`[${tableName}] Ensuring table exists...`);
    if (await tableExists(tableName)) {
      console.log(`[${tableName}] Already exists — skip.`);
      results.push({ table: tableName, skipped: true });
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
    for (const definition of pending) {
      results.push({ table: definition.TableName, skipped: false });
    }
  }

  return results;
}

module.exports = {
  id: "09-birthday-tables",
  TABLES,
  migrateBirthdayTables,
};
