/**
 * Usage: node tables/createAccessAuditLogTable.js
 */
require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createAccessAuditLogTable() {
  const params = {
    TableName: "AccessAuditLog",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "scope", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "ScopeCreatedAtIndex",
        KeySchema: [
          { AttributeName: "scope", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("AccessAuditLog table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("AccessAuditLog table already exists");
    } else {
      console.error("Error creating AccessAuditLog table:", err.message);
      process.exitCode = 1;
    }
  }
}

createAccessAuditLogTable();
