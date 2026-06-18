/**
 * ClientTestimonials & VideoTestimonials: add StatusCreatedAtIndex GSI
 * (required for Query-based list endpoints; non-destructive UpdateTable).
 */
const {
  backupTable,
  addGlobalSecondaryIndex,
  STATUS_CREATED_AT_GSI,
  tableHasIndex,
  describeTable,
} = require("../lib/helpers");

const TABLES = ["ClientTestimonials", "VideoTestimonials"];

async function migrateTestimonialsStatusGsi() {
  const results = [];

  for (const tableName of TABLES) {
    console.log(`[${tableName}] Checking StatusCreatedAtIndex...`);
    const table = await describeTable(tableName);

    if (tableHasIndex(table, STATUS_CREATED_AT_GSI.IndexName)) {
      console.log(`[${tableName}] GSI already exists — skip.`);
      results.push({ table: tableName, skipped: true });
      continue;
    }

    await backupTable(tableName);
    await addGlobalSecondaryIndex(tableName, STATUS_CREATED_AT_GSI);
    results.push({ table: tableName, skipped: false });
  }

  return results;
}

module.exports = {
  id: "02-testimonials-status-gsi",
  TABLES,
  migrateTestimonialsStatusGsi,
};
