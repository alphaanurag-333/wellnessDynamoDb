/**
 * DANGER: Deletes all Wellness DynamoDB tables defined in tableSchemas.js
 * (plus a few known extras from create*.js that may exist in the account).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/deleteAllTables.js
 *   node --use-system-ca scripts/deleteAllTables.js --yes
 */
require("dotenv").config();

const {
  DeleteTableCommand,
  ListTablesCommand,
  waitUntilTableNotExists,
} = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { TABLE_NAMES } = require("../migration/lib/tableSchemas");

const EXTRA_TABLES = [
  "Accounts",
  "StaffAccount",
  "PhysicalExercise",
  "Supplement",
  "MedicalConditionQuestion",
  "MentalWellbeing",
  "AssignedMentalWellbeing",
  "SleepTracking",
  "HeartRateTracking",
  "MigrationMeta",
  "SchemaMigration",
];

function unique(names) {
  return [...new Set(names.filter(Boolean).map((n) => String(n).trim()))];
}

async function listAllAccountTables() {
  const names = [];
  let ExclusiveStartTableName;
  do {
    const res = await client.send(
      new ListTablesCommand({
        ExclusiveStartTableName,
        Limit: 100,
      })
    );
    names.push(...(res.TableNames || []));
    ExclusiveStartTableName = res.LastEvaluatedTableName;
  } while (ExclusiveStartTableName);
  return names;
}

async function deleteTable(tableName) {
  try {
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    console.log(`  deleting: ${tableName}`);
    await waitUntilTableNotExists(
      { client, maxWaitTime: 300 },
      { TableName: tableName }
    );
    console.log(`  deleted:  ${tableName}`);
    return "deleted";
  } catch (err) {
    if (err.name === "ResourceNotFoundException") {
      console.log(`  missing:  ${tableName}`);
      return "missing";
    }
    console.error(`  ERROR ${tableName}: ${err.message}`);
    return "error";
  }
}

async function main() {
  const confirmed = process.argv.includes("--yes");
  if (!confirmed) {
    console.error("Refusing to run without --yes (this permanently deletes tables).");
    console.error("  node --use-system-ca scripts/deleteAllTables.js --yes");
    process.exit(1);
  }

  const accountTables = new Set(await listAllAccountTables());
  const candidates = unique([...TABLE_NAMES, ...EXTRA_TABLES]).filter((name) =>
    accountTables.has(name)
  );

  // Also catch any leftover project-ish tables that match known names case-sensitively
  // already filtered to account ∩ project list above.

  console.log(`AWS region tables total: ${accountTables.size}`);
  console.log(`Project tables to delete: ${candidates.length}`);
  if (candidates.length === 0) {
    console.log("Nothing to delete.");
    return;
  }

  const summary = { deleted: 0, missing: 0, error: 0 };
  for (const name of candidates.sort()) {
    const result = await deleteTable(name);
    summary[result] += 1;
  }

  console.log("\nDone:", summary);

  // Verify none of the project tables remain
  const remaining = (await listAllAccountTables()).filter((n) =>
    unique([...TABLE_NAMES, ...EXTRA_TABLES]).includes(n)
  );
  if (remaining.length) {
    console.warn("Still present:", remaining.join(", "));
    process.exitCode = 1;
  } else {
    console.log("All known project tables are gone.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
