/**
 * Create every DynamoDB table defined in migration/lib/tableSchemas.js
 * that does not already exist.
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/ensureAllTables.js
 */
require("dotenv").config();

const {
  CreateTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { TABLE_DEFINITIONS } = require("../migration/lib/tableSchemas");

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err?.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function ensureTable(def) {
  const tableName = def.TableName;
  if (await tableExists(tableName)) {
    console.log(`  exists:  ${tableName}`);
    return "exists";
  }

  console.log(`  creating: ${tableName}`);
  await client.send(new CreateTableCommand(def));
  await waitUntilTableExists({ client, maxWaitTime: 300 }, { TableName: tableName });
  console.log(`  ready:   ${tableName}`);
  return "created";
}

async function main() {
  console.log(`Ensuring ${TABLE_DEFINITIONS.length} tables…\n`);
  const counts = { created: 0, exists: 0, error: 0 };

  for (const def of TABLE_DEFINITIONS) {
    try {
      const result = await ensureTable(def);
      counts[result] += 1;
    } catch (err) {
      counts.error += 1;
      console.error(`  ERROR ${def.TableName}: ${err.message}`);
    }
  }

  console.log("\nDone.");
  console.log(`  created: ${counts.created}`);
  console.log(`  exists:  ${counts.exists}`);
  console.log(`  errors:  ${counts.error}`);
  if (counts.error) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
