require("dotenv").config();

const { CreateTableCommand } = require("@aws-sdk/client-dynamodb");
const { client } = require("../config/db");

async function createUserLaunchAssessmentTable() {
  const params = {
    TableName: "UserLaunchAssessment",
    KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
    AttributeDefinitions: [
      { AttributeName: "id", AttributeType: "S" },
      { AttributeName: "userId", AttributeType: "S" },
      { AttributeName: "assessmentDate", AttributeType: "S" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "UserAssessmentDateIndex",
        KeySchema: [
          { AttributeName: "userId", KeyType: "HASH" },
          { AttributeName: "assessmentDate", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    BillingMode: "PAY_PER_REQUEST",
  };

  try {
    const result = await client.send(new CreateTableCommand(params));
    console.log("UserLaunchAssessment table created:", result.TableDescription.TableArn);
  } catch (err) {
    if (err.name === "ResourceInUseException") {
      console.log("UserLaunchAssessment table already exists");
    } else {
      console.error("Error creating table:", err.message);
      process.exitCode = 1;
    }
  }
}

createUserLaunchAssessmentTable();
