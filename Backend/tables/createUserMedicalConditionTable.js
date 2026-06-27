require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createUserMedicalConditionTable() {
  const params = {
    TableName: "UserMedicalCondition",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
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
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("UserMedicalCondition table created:", result.TableDescription?.TableStatus);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserMedicalCondition table already exists");
      return;
    }
    throw err;
  }
}

if (require.main === module) {
  createUserMedicalConditionTable().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { createUserMedicalConditionTable };
