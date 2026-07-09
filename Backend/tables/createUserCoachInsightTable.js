/**
 * Create UserCoachInsight DynamoDB table.
 * Usage: node tables/createUserCoachInsightTable.js
 */
require("dotenv").config();

const { DynamoDBClient, CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const config = require("../config");

const client = new DynamoDBClient({
  region: config.awsRegion,
  ...(config.awsAccessKeyId && config.awsSecretAccessKey
    ? { credentials: { accessKeyId: config.awsAccessKeyId, secretAccessKey: config.awsSecretAccessKey } }
    : {}),
});

const TABLE = "UserCoachInsight";

async function main() {
  const params = {
    TableName: TABLE,
    KeySchema: [{ AttributeName: "userId", KeyType: "HASH" }],
    AttributeDefinitions: [{ AttributeName: "userId", AttributeType: "S" }],
    BillingMode: "PAY_PER_REQUEST",
  };

  await client.send(new CreateTableCommand(params));
  console.log(`Table ${TABLE} created.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
