const { CreateTableCommand, DescribeTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../../config/db");

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

module.exports = {
  tableExists,
  createAllTables,
};
