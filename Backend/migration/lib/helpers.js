const fs = require("fs");
const path = require("path");
const { ScanCommand, PutCommand, BatchWriteCommand } = require("@aws-sdk/lib-dynamodb");
const {
  DescribeTableCommand,
  UpdateTableCommand,
  DeleteTableCommand,
  CreateTableCommand,
  UpdateTimeToLiveCommand,
} = require("@aws-sdk/client-dynamodb");
const { client, docClient } = require("../../config/db");

const BACKUP_DIR = path.join(__dirname, "..", "backup");
const BATCH_SIZE = 25;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function timestampSlug() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

function backupPath(tableName) {
  const stamp = timestampSlug();
  return path.join(BACKUP_DIR, `${tableName}-${stamp}.json`);
}

function latestBackupPath(tableName) {
  if (!fs.existsSync(BACKUP_DIR)) return null;
  const files = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(`${tableName}-`) && f.endsWith(".json"))
    .sort()
    .reverse();
  return files[0] ? path.join(BACKUP_DIR, files[0]) : null;
}

async function describeTable(tableName) {
  const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
  return Table;
}

async function tableExists(tableName) {
  try {
    await describeTable(tableName);
    return true;
  } catch (err) {
    if (err.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function scanTable(tableName) {
  const items = [];
  let lastKey;

  do {
    const { Items, LastEvaluatedKey } = await docClient.send(
      new ScanCommand({
        TableName: tableName,
        ExclusiveStartKey: lastKey,
      })
    );
    if (Items?.length) items.push(...Items);
    lastKey = LastEvaluatedKey;
  } while (lastKey);

  return items;
}

function writeBackup(tableName, items) {
  ensureDir(BACKUP_DIR);
  const filePath = backupPath(tableName);
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        tableName,
        exportedAt: new Date().toISOString(),
        itemCount: items.length,
        items,
      },
      null,
      2
    ),
    "utf8"
  );
  return filePath;
}

async function backupTable(tableName) {
  const items = await scanTable(tableName);
  const filePath = writeBackup(tableName, items);
  console.log(`  Backup: ${items.length} item(s) → ${filePath}`);
  return { items, filePath };
}

async function restoreItems(tableName, items) {
  for (const item of items) {
    await docClient.send(
      new PutCommand({
        TableName: tableName,
        Item: item,
      })
    );
  }
}

async function waitForTableDeleted(tableName, maxAttempts = 120) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await describeTable(tableName);
      await sleep(3000);
    } catch (err) {
      if (err.name === "ResourceNotFoundException") return;
      throw err;
    }
  }
  throw new Error(`Timed out waiting for table ${tableName} to be deleted`);
}

async function waitForTableActive(tableName, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
    if (Table.TableStatus === "ACTIVE") return Table;
    await sleep(3000);
  }
  throw new Error(`Timed out waiting for table ${tableName} to become ACTIVE`);
}

async function waitForGsiActive(tableName, indexName, maxAttempts = 120) {
  for (let i = 0; i < maxAttempts; i += 1) {
    const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
    const gsi = Table.GlobalSecondaryIndexes?.find((g) => g.IndexName === indexName);
    const status = gsi?.IndexStatus;
    if (status === "ACTIVE") return;
    if (i % 6 === 0 && status) {
      console.log(`  Waiting for GSI ${indexName} on ${tableName} (${status})...`);
    }
    await sleep(5000);
  }
  throw new Error(`Timed out waiting for GSI ${indexName} on ${tableName}`);
}

function tableHasIndex(table, indexName) {
  return (table.GlobalSecondaryIndexes || []).some((g) => g.IndexName === indexName);
}

function tableRangeKeyName(table) {
  return table.KeySchema.find((k) => k.KeyType === "RANGE")?.AttributeName || null;
}

async function addGlobalSecondaryIndex(tableName, indexDef) {
  const table = await describeTable(tableName);
  const existing = (table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === indexDef.IndexName);
  if (existing) {
    if (existing.IndexStatus === "ACTIVE") {
      console.log(`  GSI ${indexDef.IndexName} already ACTIVE on ${tableName} — skip.`);
      return false;
    }
    console.log(`  GSI ${indexDef.IndexName} is ${existing.IndexStatus} — waiting...`);
    await waitForGsiActive(tableName, indexDef.IndexName);
    return true;
  }

  const existingAttrs = new Map(
    (table.AttributeDefinitions || []).map((a) => [a.AttributeName, a.AttributeType])
  );

  for (const key of indexDef.KeySchema) {
    const attrName = key.AttributeName;
    if (!existingAttrs.has(attrName)) {
      const fromDef = indexDef._attributeTypes?.[attrName];
      if (!fromDef) {
        throw new Error(`Missing attribute type for ${attrName} on ${tableName}`);
      }
      existingAttrs.set(attrName, fromDef);
    }
  }

  await client.send(
    new UpdateTableCommand({
      TableName: tableName,
      AttributeDefinitions: [...existingAttrs.entries()].map(([AttributeName, AttributeType]) => ({
        AttributeName,
        AttributeType,
      })),
      GlobalSecondaryIndexUpdates: [
        {
          Create: {
            IndexName: indexDef.IndexName,
            KeySchema: indexDef.KeySchema,
            Projection: indexDef.Projection || { ProjectionType: "ALL" },
          },
        },
      ],
    })
  );

  console.log(`  Creating GSI ${indexDef.IndexName} on ${tableName}...`);
  await waitForGsiActive(tableName, indexDef.IndexName);
  console.log(`  GSI ${indexDef.IndexName} is ACTIVE.`);
  return true;
}

async function dropGlobalSecondaryIndex(tableName, indexName) {
  const table = await describeTable(tableName);
  if (!tableHasIndex(table, indexName)) {
    console.log(`  GSI ${indexName} not on ${tableName} — skip.`);
    return false;
  }

  await client.send(
    new UpdateTableCommand({
      TableName: tableName,
      GlobalSecondaryIndexUpdates: [{ Delete: { IndexName: indexName } }],
    })
  );

  console.log(`  Dropped GSI ${indexName} on ${tableName}.`);
  await waitForTableActive(tableName);
  return true;
}

const STATUS_CREATED_AT_GSI = {
  IndexName: "StatusCreatedAtIndex",
  KeySchema: [
    { AttributeName: "status", KeyType: "HASH" },
    { AttributeName: "createdAt", KeyType: "RANGE" },
  ],
  Projection: { ProjectionType: "ALL" },
  _attributeTypes: {
    status: "S",
    createdAt: "S",
  },
};

async function backupTableToDir(tableName, backupDir) {
  const items = await scanTable(tableName);
  const filePath = path.join(backupDir, `${tableName}.json`);
  fs.writeFileSync(
    filePath,
    JSON.stringify(
      {
        tableName,
        exportedAt: new Date().toISOString(),
        itemCount: items.length,
        items,
      },
      null,
      2
    ),
    "utf8"
  );
  console.log(`  Backup ${tableName}: ${items.length} item(s) → ${filePath}`);
  return { tableName, itemCount: items.length, filePath, items };
}

async function backupAllTables(tableNames, { backupRoot = BACKUP_DIR } = {}) {
  const backupDir = path.join(backupRoot, `full-rebuild-${timestampSlug()}`);
  ensureDir(backupDir);

  const manifest = {
    exportedAt: new Date().toISOString(),
    tables: [],
  };

  console.log(`Backing up ${tableNames.length} table(s) to ${backupDir} ...`);

  for (const tableName of tableNames) {
    if (!(await tableExists(tableName))) {
      console.log(`  Skip ${tableName}: table does not exist`);
      manifest.tables.push({ tableName, itemCount: 0, skipped: true });
      continue;
    }
    const result = await backupTableToDir(tableName, backupDir);
    manifest.tables.push({ tableName: result.tableName, itemCount: result.itemCount });
  }

  fs.writeFileSync(path.join(backupDir, "manifest.json"), JSON.stringify(manifest, null, 2), "utf8");
  console.log(`Backup complete → ${backupDir}`);
  return { backupDir, manifest };
}

async function dropTable(tableName) {
  if (!(await tableExists(tableName))) {
    console.log(`  Skip drop ${tableName}: not found`);
    return false;
  }
  await client.send(new DeleteTableCommand({ TableName: tableName }));
  console.log(`  Dropping ${tableName}...`);
  await waitForTableDeleted(tableName);
  console.log(`  Dropped ${tableName}`);
  return true;
}

async function dropAllTables(tableNames) {
  console.log(`Dropping ${tableNames.length} table(s)...`);
  for (const tableName of tableNames) {
    await dropTable(tableName);
  }
}

async function createTableFromDefinition(definition) {
  const { TableName } = definition;
  if (await tableExists(TableName)) {
    console.log(`  Skip create ${TableName}: already exists`);
    return false;
  }

  await client.send(new CreateTableCommand(definition));
  console.log(`  Creating ${TableName}...`);
  await waitForTableActive(TableName);
  console.log(`  Created ${TableName}`);
  return true;
}

async function createAllTables(tableDefinitions) {
  console.log(`Creating ${tableDefinitions.length} table(s)...`);
  for (const definition of tableDefinitions) {
    await createTableFromDefinition(definition);
  }
}

async function enableRegistrationOtpTtl() {
  const tableName = "RegistrationOtp";
  if (!(await tableExists(tableName))) return;
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: tableName,
        TimeToLiveSpecification: { AttributeName: "ttl", Enabled: true },
      })
    );
    console.log("  RegistrationOtp TTL enabled");
  } catch (err) {
    console.warn(`  RegistrationOtp TTL warning: ${err.message}`);
  }
}

async function batchWriteItems(tableName, items) {
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    let request = {
      RequestItems: {
        [tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
      },
    };

    let attempts = 0;
    while (attempts < 8) {
      const result = await docClient.send(new BatchWriteCommand(request));
      const unprocessed = result.UnprocessedItems?.[tableName] || [];
      if (!unprocessed.length) break;
      request = { RequestItems: { [tableName]: unprocessed } };
      attempts += 1;
      await sleep(500 * attempts);
    }
  }
}

function readBackupFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed.items) ? parsed.items : [];
}

function findLatestFullRebuildBackup(backupRoot = BACKUP_DIR) {
  if (!fs.existsSync(backupRoot)) return null;
  const dirs = fs
    .readdirSync(backupRoot)
    .filter((name) => name.startsWith("full-rebuild-"))
    .sort()
    .reverse();
  return dirs[0] ? path.join(backupRoot, dirs[0]) : null;
}

function resolveBackupDir(explicitPath) {
  if (explicitPath) {
    const resolved = path.isAbsolute(explicitPath)
      ? explicitPath
      : path.join(BACKUP_DIR, explicitPath);
    if (!fs.existsSync(resolved)) {
      throw new Error(`Backup directory not found: ${resolved}`);
    }
    return resolved;
  }
  const latest = findLatestFullRebuildBackup();
  if (!latest) throw new Error("No full-rebuild backup found under migration/backup/");
  return latest;
}

module.exports = {
  BACKUP_DIR,
  sleep,
  describeTable,
  tableExists,
  scanTable,
  backupTable,
  restoreItems,
  writeBackup,
  latestBackupPath,
  waitForTableDeleted,
  waitForTableActive,
  waitForGsiActive,
  tableHasIndex,
  tableRangeKeyName,
  addGlobalSecondaryIndex,
  dropGlobalSecondaryIndex,
  STATUS_CREATED_AT_GSI,
  client,
  CreateTableCommand,
  DeleteTableCommand,
  backupAllTables,
  dropAllTables,
  createAllTables,
  enableRegistrationOtpTtl,
  batchWriteItems,
  readBackupFile,
  findLatestFullRebuildBackup,
  resolveBackupDir,
};
