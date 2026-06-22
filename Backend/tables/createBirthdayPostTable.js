require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createBirthdayPostTable() {
  const params = {
    TableName: "BirthdayPost",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "postDate", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "status", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "PostDateCreatedAtIndex",
        KeySchema: [
          { AttributeName: "postDate", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "UserPostDateIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "postDate", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
      {
        IndexName: "StatusPostDateIndex",
        KeySchema: [
          { AttributeName: "status", KeyType: "HASH" },
          { AttributeName: "postDate", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("BirthdayPost table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("BirthdayPost table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createBirthdayPostTable();
