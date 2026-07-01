const fs = require("fs");
const path = require("path");
const { CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { ScanCommand } = require("@aws-sdk/lib-dynamodb");
const { client, docClient } = require("../../config/db");

const BACKUP_DIR = path.join(__dirname, "..", "backup");

async function tableExists(tableName) {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (err) {
    if (err?.name === "ResourceNotFoundException") return false;
    throw err;
  }
}

async function createAllTables(definitions) {
  for (const params of definitions) {
    const tableName = params.TableName;
    console.log(`  Creating table ${tableName}...`);
    await client.send(new CreateTableCommand(params));
    console.log(`  [${tableName}] created`);
  }
}

async function backupTable(tableName) {
  const items = await scanTable(tableName);
  const exportedAt = new Date().toISOString();
  const safeStamp = exportedAt.replace(/[:.]/g, "-");
  const fileName = `${tableName}-${safeStamp}.json`;

  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  const filePath = path.join(BACKUP_DIR, fileName);
  const payload = {
    tableName,
    exportedAt,
    itemCount: items.length,
    items,
  };

  fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), "utf8");
  console.log(`  [${tableName}] backup written to migration/backup/${fileName}`);
  return filePath;
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForGsiActive(tableName, indexName, { timeoutMs = 15 * 60 * 1000, pollMs = 5000 } = {}) {
  const started = Date.now();

  while (Date.now() - started < timeoutMs) {
    const { Table } = await client.send(new DescribeTableCommand({ TableName: tableName }));
    const gsi = (Table.GlobalSecondaryIndexes || []).find((g) => g.IndexName === indexName);
    if (!gsi) {
      throw new Error(`GSI ${indexName} not found on ${tableName}`);
    }
    if (gsi.IndexStatus === "ACTIVE") {
      return;
    }
    console.log(`  [${tableName}] waiting for ${indexName} (${gsi.IndexStatus})...`);
    await sleep(pollMs);
  }

  throw new Error(`Timed out waiting for ${indexName} on ${tableName} to become ACTIVE`);
}

module.exports = {
  backupTable,
  createAllTables,
  scanTable,
  tableExists,
  waitForGsiActive,
};
