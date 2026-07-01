require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createMealTrackingTable() {
  const params = {
    TableName: "MealTracking",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "date", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "coachId", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserDateIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "date", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "UserCreatedAtIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "CoachCreatedAtIndex",
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
    console.log("MealTracking table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("MealTracking table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createMealTrackingTable();
