const fs = require("fs");
const path = require("path");
const { ScanCommand, PutCommand } = require("@aws-sdk/lib-dynamodb");
const {
  DescribeTableCommand,
  UpdateTableCommand,
  DeleteTableCommand,
  CreateTableCommand,
} = require("@aws-sdk/client-dynamodb");
const { client, docClient } = require("../../config/db");

const BACKUP_DIR = path.join(__dirname, "..", "backup");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backupPath(tableName) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
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
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
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

async function waitForTableDeleted(tableName, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      await client.send(new DescribeTableCommand({ TableName: tableName }));
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

module.exports = {
  BACKUP_DIR,
  sleep,
  describeTable,
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
};
