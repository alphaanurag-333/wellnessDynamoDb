/**
 * Create CofounderMessage DynamoDB table.
 * Usage: node tables/createCofounderMessageTable.js
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

const TABLE = "CofounderMessage";

async function main() {
  const params = {
    TableName: TABLE,
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "StatusCreatedAtIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  await client.send(new CreateTableCommand(params));
  console.log(`Table ${TABLE} created.`);
}

main().catch((err) => {
  console.error(err.message);
  process.exitCode = 1;
});
