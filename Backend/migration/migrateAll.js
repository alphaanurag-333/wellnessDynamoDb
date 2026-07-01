/**
 * Run schema migrations present in migration/migrations/.
 *
 * Usage (from Backend/):
 *   node migration/migrateAll.js
 *   node migration/migrateAll.js --only=16-progress-photos-and-onboarding-steps
 *
 * Backups are written to migration/backup/
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");

const MIGRATIONS_DIR = path.join(__dirname, "migrations");

function loadMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((name) => name.endsWith(".js"))
    .sort();

  return files.map((name) => {
    const migration = require(path.join(MIGRATIONS_DIR, name));
    if (!migration?.id) {
      throw new Error(`Migration ${name} must export an id`);
    }
    return migration;
  });
}

function getRunner(migration) {
  const runnerKey = Object.keys(migration).find(
    (key) => key.startsWith("migrate") && typeof migration[key] === "function"
  );
  if (!runnerKey) {
    throw new Error(`Migration ${migration.id} has no migrate* runner export`);
  }
  return migration[runnerKey];
}


function parseOnlyArg() {
  const only = process.argv.find((a) => a.startsWith("--only="));
  if (!only) return null;
  return only.replace("--only=", "").trim();
}

async function run() {
  const only = parseOnlyArg();
  const migrations = loadMigrations();
  const selected = only
    ? migrations.filter((m) => m.id === only || m.id.endsWith(only))
    : migrations;

  if (selected.length === 0) {
    console.error(`No migration matched --only=${only}`);
    console.error(
      `Available: ${migrations.map((m) => m.id).join(", ") || "(none)"}`
    );
    process.exitCode = 1;
    return;
  }

  console.log("Wellness DynamoDB migrations");
  console.log(`Running ${selected.length} migration(s)...\n`);

  for (const migration of selected) {
    const runner = getRunner(migration);
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
