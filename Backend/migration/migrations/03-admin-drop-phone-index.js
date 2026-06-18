/**
 * Admin: drop legacy PhoneIndex if still present (non-destructive).
 * Skipped automatically when Admin was recreated by 01-admin-single-key.
 */
const { dropGlobalSecondaryIndex, backupTable, describeTable, tableHasIndex } = require("../lib/helpers");

const TABLE = "Admin";
const INDEX = "PhoneIndex";

async function migrateAdminDropPhoneIndex() {
  const table = await describeTable(TABLE);

  if (!tableHasIndex(table, INDEX)) {
    console.log(`[Admin] ${INDEX} not present — skip.`);
    return { skipped: true, table: TABLE };
  }

  console.log(`[Admin] Dropping unused ${INDEX}...`);
  await backupTable(TABLE);
  await dropGlobalSecondaryIndex(TABLE, INDEX);

  console.log("[Admin] PhoneIndex removed.");
  return { skipped: false, table: TABLE };
}

module.exports = { id: "03-admin-drop-phone-index", TABLE, migrateAdminDropPhoneIndex };
