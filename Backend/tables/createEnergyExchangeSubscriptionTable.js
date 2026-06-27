require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createEnergyExchangeSubscriptionTable() {
  const params = {
    TableName: "EnergyExchangeSubscription",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
      { AttributeName: "endsAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdStatusIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "status", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "StatusEndsAtIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "endsAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("EnergyExchangeSubscription table created:", result.TableDescription?.TableStatus);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("EnergyExchangeSubscription table already exists");
      return;
    }
    throw err;
  }
}

if (require.main === module) {
  createEnergyExchangeSubscriptionTable().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createEnergyExchangeSubscriptionTable };
