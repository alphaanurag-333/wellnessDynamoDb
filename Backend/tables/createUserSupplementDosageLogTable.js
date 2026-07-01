require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createUserSupplementDosageLogTable() {
  const params = {
    TableName: "UserSupplementDosageLog",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "dosageId", AttributeType: "S" },
      { AttributeName: "logDate", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "DosageDateIndex",
        KeySchema: [
          { AttributeName: "dosageId", KeyType: "HASH" },
          { AttributeName: "logDate", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "UserDateIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "logDate", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("UserSupplementDosageLog table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserSupplementDosageLog table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createUserSupplementDosageLogTable();
