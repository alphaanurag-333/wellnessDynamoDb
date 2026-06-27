require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createEnergyExchangeProgramTable() {
  const params = {
    TableName: "EnergyExchangeProgram",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "coachId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "CoachIdCreatedAtIndex",
        KeySchema: [
          { AttributeName: "coachId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("EnergyExchangeProgram table created:", result.TableDescription?.TableStatus);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("EnergyExchangeProgram table already exists");
      return;
    }
    throw err;
  }
}

if (require.main === module) {
  createEnergyExchangeProgramTable().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createEnergyExchangeProgramTable };
