/**
 * Diff AWS DynamoDB tables vs tableSchemas + Backend/tables create scripts,
 * then create any missing tables (adding orphan create-script schemas into
 * tableSchemas when needed).
 *
 * Usage (from Backend/):
 *   node --use-system-ca scripts/ensureMissingTables.js
 *   node --use-system-ca scripts/ensureMissingTables.js --dry-run
 */
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  CreateTableCommand,
  DescribeTableCommand,
  ListTablesCommand,
  waitUntilTableExists,
} = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");
const { TABLE_DEFINITIONS, TABLE_NAMES, getTableDefinition } = require("../migration/lib/tableSchemas");

const PAY_PER_REQUEST = { BillingMode: "PAY_PER_REQUEST" };

function statusCreatedAtIndex() {
  return {
    IndexName: "StatusCreatedAtIndex",
    KeySchema: [
      { AttributeName: "status", KeyType: "HASH" },
      { AttributeName: "createdAt", KeyType: "RANGE" },
    ],
    Projection: { ProjectionType: "ALL" },
  };
}

/** Schemas for create-script tables not yet in TABLE_DEFINITIONS (must match Backend/tables). */
const ORPHAN_SCHEMAS = {
  SleepTracking: {
    TableName: "SleepTracking",
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "recordKey", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "recordKey", AttributeType: "S" },
    ],
    ...PAY_PER_REQUEST,
  },
  HeartRateTracking: {
    TableName: "HeartRateTracking",
    KeySchema: [
      { AttributeName: "userId", KeyType: "HASH" },
      { AttributeName: "recordKey", KeyType: "RANGE" },
    ],
    AttributeDefinitions: [
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "recordKey", AttributeType: "S" },
    ],
    ...PAY_PER_REQUEST,
  },
  AssignedMentalWellbeing: {
    TableName: "AssignedMentalWellbeing",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "coachId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "CoachCreatedAtIndex",
        KeySchema: [
          { AttributeName: "coachId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ...PAY_PER_REQUEST,
  },
};

function collectCreateScriptTableNames() {
  const dir = path.join(__dirname, "..", "tables");
  const names = new Set();
  for (const file of fs.readdirSync(dir)) {
    if (!file.startsWith("create") || !file.endsWith(".js")) continue;
    const src = fs.readFileSync(path.join(dir, file), "utf8");
    const re = /TableName:\s*["']([^"']+)["']/g;
    let match;
    while ((match = re.exec(src))) names.add(match[1]);
  }
  return names;
}

async function listExistingTables() {
  const names = [];
  let ExclusiveStartTableName;
  do {
    const res = await client.send(
      new ListTablesCommand({ ExclusiveStartTableName, Limit: 100 })
    );
    names.push(...(res.TableNames || []));
    ExclusiveStartTableName = res.LastEvaluatedTableName;
  } while (ExclusiveStartTableName);
  return new Set(names);
}

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err?.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

function resolveDefinition(tableName) {
  return getTableDefinition(tableName) || ORPHAN_SCHEMAS[tableName] || null;
}

async function ensureTable(tableName) {
  if (await tableExists(tableName)) {
    console.log(`  exists:  ${tableName}`);
    return "exists";
  }
  const def = resolveDefinition(tableName);
  if (!def) {
    console.error(`  SKIP (no schema): ${tableName}`);
    return "noschema";
  }
  console.log(`  creating: ${tableName}`);
  await client.send(new CreateTableCommand(def));
  await waitUntilTableExists({ client, maxWaitTime: 300 }, { TableName: tableName });
  console.log(`  ready:   ${tableName}`);
  return "created";
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const existing = await listExistingTables();
  const fromScripts = collectCreateScriptTableNames();
  const expected = new Set([...TABLE_NAMES, ...fromScripts, ...Object.keys(ORPHAN_SCHEMAS)]);
  const missing = [...expected].filter((n) => !existing.has(n)).sort();
  const extra = [...existing].filter((n) => !expected.has(n)).sort();

  console.log(`Existing AWS tables: ${existing.size}`);
  console.log(`Expected (schemas + create scripts): ${expected.size}`);
  console.log(`Missing: ${missing.length}`);
  if (missing.length) missing.forEach((n) => console.log(`  - ${n}`));
  if (extra.length) {
    console.log(`Extra in AWS (not tracked): ${extra.length}`);
    extra.forEach((n) => console.log(`  - ${n}`));
  }

  if (!missing.length) {
    console.log("\nNothing to create.");
    return;
  }

  if (dryRun) {
    console.log("\nDry run — not creating.");
    return;
  }

  console.log("\nCreating missing tables…\n");
  const counts = { created: 0, exists: 0, noschema: 0, error: 0 };
  for (const name of missing) {
    try {
      const result = await ensureTable(name);
      counts[result] += 1;
    } catch (err) {
      counts.error += 1;
      console.error(`  ERROR ${name}: ${err.message}`);
    }
  }

  console.log("\nDone.");
  console.log(`  created:  ${counts.created}`);
  console.log(`  exists:   ${counts.exists}`);
  console.log(`  noschema: ${counts.noschema}`);
  console.log(`  errors:   ${counts.error}`);
  if (counts.error || counts.noschema) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
