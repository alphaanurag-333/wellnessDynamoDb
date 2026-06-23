/**
 * Run all schema migrations for high-severity audit fixes.
 *
 * Usage (from Backend/):
 *   node migration/migrateAll.js
 *   node migration/migrateAll.js --only=02-testimonials-status-gsi
 *
 * Backups are written to migration/backup/
 */
require("dotenv").config();

const adminMigration = require("./migrations/01-admin-single-key");
const testimonialsMigration = require("./migrations/02-testimonials-status-gsi");
const phoneIndexMigration = require("./migrations/03-admin-drop-phone-index");
const mediaFieldsMigration = require("./migrations/04-media-field-camelcase");
const userReferralMigration = require("./migrations/05-user-referral-assignment");
const appConfigPaymentMethodsMigration = require("./migrations/06-appconfig-drop-payment-methods");
const userParentCoachSparseMigration = require("./migrations/07-user-parent-coach-sparse-index");
const consultancySparseMigration = require("./migrations/08-consultancy-transaction-sparse-index");
const birthdayTablesMigration = require("./migrations/09-birthday-tables");
const userDobMonthDayMigration = require("./migrations/10-user-dob-month-day-index");
const cofounderMessageMigration = require("./migrations/11-cofounder-message-table");

const MIGRATIONS = [
  adminMigration,
  testimonialsMigration,
  phoneIndexMigration,
  mediaFieldsMigration,
  userReferralMigration,
  appConfigPaymentMethodsMigration,
  userParentCoachSparseMigration,
  consultancySparseMigration,
  birthdayTablesMigration,
  userDobMonthDayMigration,
  cofounderMessageMigration,
];

function parseOnlyArg() {
  const only = process.argv.find((a) => a.startsWith("--only="));
  if (!only) return null;
  return only.replace("--only=", "").trim();
}

async function run() {
  const only = parseOnlyArg();
  const selected = only
    ? MIGRATIONS.filter((m) => m.id === only || m.id.endsWith(only))
    : MIGRATIONS;

  if (selected.length === 0) {
    console.error(`No migration matched --only=${only}`);
    process.exitCode = 1;
    return;
  }

  console.log("Wellness DynamoDB migrations");
  console.log(`Running ${selected.length} migration(s)...\n`);

  for (const migration of selected) {
    const runner =
      migration.migrateAdminSingleKey ||
      migration.migrateTestimonialsStatusGsi ||
      migration.migrateAdminDropPhoneIndex ||
      migration.migrateMediaFieldCamelCase ||
      migration.migrateUserReferralAssignment ||
      migration.migrateAppConfigDropPaymentMethods ||
      migration.migrateUserParentCoachSparseIndex ||
      migration.migrateConsultancyTransactionSparseIndex ||
      migration.migrateBirthdayTables ||
      migration.migrateUserDobMonthDayIndex ||
      migration.migrateCofounderMessageTable;

    console.log(`--- ${migration.id} ---`);
    await runner();
    console.log("");
  }

  console.log("All selected migrations finished.");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exitCode = 1;
});
