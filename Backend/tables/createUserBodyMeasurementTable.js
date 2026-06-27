require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createUserBodyMeasurementTable() {
  const params = {
    TableName: "UserBodyMeasurement",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "recordedAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdRecordedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "recordedAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("UserBodyMeasurement table created:", result.TableDescription?.TableStatus);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserBodyMeasurement table already exists");
      return;
    }
    throw err;
  }
}

if (require.main === module) {
  createUserBodyMeasurementTable().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createUserBodyMeasurementTable };
