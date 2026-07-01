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

module.exports = {
  backupTable,
  createAllTables,
  scanTable,
  tableExists,
};
