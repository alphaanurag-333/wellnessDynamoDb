require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createBirthdayPostCommentTable() {
  const params = {
    TableName: "BirthdayPostComment",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "birthdayPostId", AttributeType: "S" },
      { AttributeName: "createdAt", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "BirthdayPostCreatedAtIndex",
        KeySchema: [
          { AttributeName: "birthdayPostId", KeyType: "HASH" },
          { AttributeName: "createdAt", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("BirthdayPostComment table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("BirthdayPostComment table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createBirthdayPostCommentTable();
