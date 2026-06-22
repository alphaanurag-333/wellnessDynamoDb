/**
 * Full DynamoDB rebuild:
 *   1. Backup all app tables to migration/backup/full-rebuild-<timestamp>/
 *   2. Drop all tables (removes legacy/unwanted GSIs)
 *   3. Recreate tables from migration/lib/tableSchemas.js (latest indexes only)
 *   4. Restore data with GSI-safe sanitization
 *
 * Usage (from Backend/):
 *   node migration/rebuildAllTables.js --backup-only
 *   node migration/rebuildAllTables.js --confirm
 *   node migration/rebuildAllTables.js --confirm --from-backup=full-rebuild-2026-06-20T12-00-00
 */
require("dotenv").config();

const path = require("path");
const fs = require("fs");
const { connectDatabase } = require("../config/db");
const { TABLE_DEFINITIONS, TABLE_NAMES } = require("./lib/tableSchemas");
const {
  BACKUP_DIR,
  backupAllTables,
  dropAllTables,
  createAllTables,
  enableRegistrationOtpTtl,
  batchWriteItems,
  readBackupFile,
  resolveBackupDir,
} = require("./lib/helpers");
const { sanitizeItemsForRestore } = require("./lib/sanitizeRestoreItem");

function parseArgs(argv) {
  const confirm = argv.includes("--confirm");
  const backupOnly = argv.includes("--backup-only");
  const fromBackupArg = argv.find((a) => a.startsWith("--from-backup="));
  const fromBackup = fromBackupArg ? fromBackupArg.replace("--from-backup=", "").trim() : null;
  return { confirm, backupOnly, fromBackup };
}

async function restoreFromBackup(backupDir) {
  const manifestPath = path.join(backupDir, "manifest.json");
  const tableNames = fs.existsSync(manifestPath)
    ? JSON.parse(fs.readFileSync(manifestPath, "utf8")).tables.map((t) => t.tableName)
    : TABLE_NAMES;

  console.log(`Restoring data from ${backupDir} ...`);

  for (const tableName of tableNames) {
    const filePath = path.join(backupDir, `${tableName}.json`);
    if (!fs.existsSync(filePath)) {
      console.log(`  Skip restore ${tableName}: no backup file`);
      continue;
    }

    const rawItems = readBackupFile(filePath);
    const items = sanitizeItemsForRestore(tableName, rawItems);
    if (!items.length) {
      console.log(`  Restore ${tableName}: 0 items`);
      continue;
    }

    await batchWriteItems(tableName, items);
    console.log(`  Restore ${tableName}: ${items.length} item(s)`);
  }
}

async function rebuildAllTables({ confirm, backupOnly, fromBackup }) {
  await connectDatabase();
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  let backupDir = null;

  if (!fromBackup) {
    const backup = await backupAllTables(TABLE_NAMES);
    backupDir = backup.backupDir;
  } else {
    backupDir = resolveBackupDir(fromBackup);
    console.log(`Using existing backup: ${backupDir}`);
  }

  if (backupOnly) {
    console.log("Backup-only mode complete.");
    return { backupDir };
  }

  if (!confirm) {
    console.log("\nRebuild NOT executed (missing --confirm).");
    console.log("Backup is saved. To drop, recreate, and restore run:");
    console.log(`  node migration/rebuildAllTables.js --confirm --from-backup=${path.basename(backupDir)}`);
    return { backupDir, executed: false };
  }

  console.log("\n=== DROP ALL TABLES ===");
  await dropAllTables(TABLE_NAMES);

  console.log("\n=== CREATE TABLES (latest schema) ===");
  await createAllTables(TABLE_DEFINITIONS);
  await enableRegistrationOtpTtl();

  console.log("\n=== RESTORE DATA ===");
  await restoreFromBackup(backupDir);

  console.log("\nFull rebuild complete.");
  return { backupDir, executed: true };
}

const args = parseArgs(process.argv.slice(2));

rebuildAllTables(args).catch((err) => {
  console.error("Rebuild failed:", err.message);
  process.exitCode = 1;
});
